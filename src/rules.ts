import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESTree,
} from "@typescript-eslint/utils";
import * as ts from "typescript";

/*
 * must-use-result reports
 *
 *   mustUse          a Result, or an array, tuple or nullable that holds
 *                    one, that is dropped: `validate(x);`
 *   mustUseAsync     a Promise of such a value that is dropped:
 *                    `save(x);` with `save` async
 *   mustUseCallback  a callback that returns a Result, passed where the
 *                    caller ignores its return value: `xs.forEach(validate)`
 *   noAwait          a call typed with the "does not await" type of
 *                    `Result.map`, `Result.tryCatch` or `Maybe.map`
 *
 * A value is dropped by an expression statement, by every part of a
 * sequence but the last (wherever the sequence is) and by the init and
 * update clauses of `for`.  Where one of those drops `a && b`, `a || b` or
 * `a ?? b`, it drops both operands: the operator reads `a`, but nothing
 * keeps it.  Where it drops `c ? a : b`, it drops both branches.
 *
 * A value that a variable, field or entry holds is stored; a value that a
 * call makes is fresh (see "Stored or fresh").  A dropped value is reported,
 * a stored one too (`r;`), except
 *
 *   an assignment                         `r = getResult()`
 *   a stored value as the left operand    `cached && send(cached)`
 *     of `&&` / `||` / `??`, which reads
 *     it
 *   a call that hands back a stored       `results.sort(cmp)`,
 *     value it got, or elements of it     `Result.inspect(r, log)`,
 *                                         `Object.freeze(r)`,
 *                                         `this.items.shift()`,
 *                                         `p.finally(cleanup)`
 *   `await` of a stored Promise, which    `await this.ready`
 *     hands back the Result it holds
 *
 * Such a call returns what a variable, field or entry held, so dropping
 * its value loses no Result that the code had not stored.
 *
 * no-unwrap reports a throwing function (`unwrap`, `unwrapErr`) that takes
 * a Result or a Maybe, wherever it is read:
 *
 *   a member              `Result.unwrap`, `r["unwrap"]`, `r[key]` with
 *                         `key: "unwrap"` or `key: "unwrap" | "unwrapOr"`
 *   a destructuring key   `const { unwrap } = Result`, `({ unwrap: f } =
 *                         Result)`, `const { [key]: f } = Result`
 *   an array element      `const [take] = fns` with `fns: (typeof
 *                         Result.unwrap)[]`, also behind a default
 *                         (`{ fns: [take] = [] }`), and a call of one,
 *                         `fns[0](r)`
 *   a call by name        `unwrap(r)`, unless a destructuring declaration
 *                         or assignment bound `unwrap`, which is reported
 *                         there
 *
 * A member or a destructuring key is judged by the property of the object
 * it reads, else by the type of what it reads: the member, for a key of
 * one name, or the bound value.  An array element has no key: it is
 * judged by the declared name of the function.
 */

// The anchor of the README heading "ESLint Rule: `<name>`".
const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semyonf/kamchazky#eslint-rule-${name}`
);

// ---------------------------------------------------------------------------
// What is a Result or a Maybe
// ---------------------------------------------------------------------------

function hasBooleanProperty(
  type: ts.Type,
  name: string,
  checker: ts.TypeChecker
): boolean {
  const property = type.getProperty(name);
  if (!property) return false;

  // Require a literal `true` / `false` discriminant. A plain `boolean`
  // (e.g. an API DTO like `{ ok: boolean; error?: string }`) gives no
  // narrowing and is not a Result or Maybe in this library's sense.
  const propertyType = checker.getTypeOfSymbol(property);
  return (propertyType.flags & ts.TypeFlags.BooleanLiteral) !== 0;
}

function isResultMember(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (!hasBooleanProperty(type, "ok", checker)) return false;

  return Boolean(type.getProperty("value") ?? type.getProperty("error"));
}

function isMaybeMember(type: ts.Type, checker: ts.TypeChecker): boolean {
  return hasBooleanProperty(type, "some", checker);
}

const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

/** Not `null`, `undefined` or `void`.  A member of those beside a Result
 *  leaves it a Result: `Result<T, E> | null`, and `R | void`, which
 *  `save().catch(() => {})` resolves to. */
function nonNullish(type: ts.Type): boolean {
  return (type.flags & NULLISH) === 0;
}

/** The members of `type` that are not nullish. */
function nonNullishMembers(type: ts.Type): ts.Type[] {
  return (type.isUnion() ? type.types : [type]).filter(nonNullish);
}

function everyMember(
  type: ts.Type,
  isMember: (member: ts.Type) => boolean
): boolean {
  if (type.isUnion()) {
    const members = nonNullishMembers(type);
    return members.length > 0 && members.every(isMember);
  }

  return isMember(type);
}

const GENERIC =
  ts.TypeFlags.TypeParameter |
  ts.TypeFlags.Conditional |
  ts.TypeFlags.Substitution |
  ts.TypeFlags.IndexedAccess;

/** A type parameter (`T extends Result<…>`) or `Awaited<T>` stands for its
 *  constraint. */
function resolved(type: ts.Type, checker: ts.TypeChecker): ts.Type {
  if ((type.flags & GENERIC) === 0) return type;
  return checker.getBaseConstraintOfType(type) ?? type;
}

function isResultLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  return everyMember(resolved(type, checker), (member) =>
    isResultMember(member, checker)
  );
}

function isMaybeLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  const target = resolved(type, checker);
  const members = target.isUnion() ? target.types : [target];
  return (
    everyMember(target, (member) => isMaybeMember(member, checker)) &&
    members.some((member) => Boolean(member.getProperty("value")))
  );
}

/** A function whose first parameter is a Result or a Maybe, also an
 *  optional one (`opt?.unwrap`, `{ unwrap?: … }`). */
function takesResultOrMaybe(type: ts.Type, checker: ts.TypeChecker): boolean {
  const signatures = checker.getNonNullableType(type).getCallSignatures();
  return signatures.some((signature) => {
    const [first] = signature.getParameters();
    if (!first) return false;

    const parameterType = checker.getTypeOfSymbol(first);
    return (
      isResultLike(parameterType, checker) ||
      isMaybeLike(parameterType, checker)
    );
  });
}

/** The name of `a.name`, `a["name"]` or `a[0]`; `undefined` for a key that
 *  only its type names. */
function memberName(node: TSESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
    return node.property.name;
  }
  if (node.computed && node.property.type === AST_NODE_TYPES.Literal) {
    return String(node.property.value);
  }
  return undefined;
}

/** The names a key type stands for: "unwrap", or each member of
 *  "unwrap" | "unwrapOr". */
function literalNames(type: ts.Type): string[] {
  return (type.isUnion() ? type.types : [type]).flatMap((member) =>
    member.isStringLiteral() ? [member.value] : []
  );
}

/** `node` without the wrappers that keep its value: `as`, `<T>` and
 *  `satisfies` casts, and with `nonNull` / `chain` also `!` and the
 *  optional chain around `a?.b`. */
function stripWrappers(
  node: TSESTree.Node,
  { nonNull = false, chain = false } = {}
): TSESTree.Node {
  let inner = node;
  for (;;) {
    switch (inner.type) {
      case AST_NODE_TYPES.TSAsExpression:
      case AST_NODE_TYPES.TSSatisfiesExpression:
      case AST_NODE_TYPES.TSTypeAssertion:
        inner = inner.expression;
        break;
      case AST_NODE_TYPES.TSNonNullExpression:
        if (!nonNull) return inner;
        inner = inner.expression;
        break;
      case AST_NODE_TYPES.ChainExpression:
        if (!chain) return inner;
        inner = inner.expression;
        break;
      default:
        return inner;
    }
  }
}

// ---------------------------------------------------------------------------
// must-use-result: types that carry a Result
// ---------------------------------------------------------------------------

/** How deep `carriesResult` and `promisesResult` look into nested arrays.
 *  A recursive type (`type Deep = Deep[]`) nests without end, and some
 *  generic ones build a new element type at every level, so a set of
 *  visited types is not enough. */
const MAX_ARRAY_DEPTH = 8;

/** An element of an array or tuple that holds a Result: the Result itself,
 *  a Result or nullish (`split` gives `[ErrResult | undefined, …]`), an
 *  array or tuple that holds one (`chunks.map((c) => c.map(validate))`),
 *  or an entry of `Promise.allSettled` whose `value` is a Result. */
function elementCarriesResult(
  element: ts.Type,
  checker: ts.TypeChecker,
  depth: number
): boolean {
  if (isResultLike(element, checker)) return true;
  const members = element.isUnion() ? element.types : [element];
  return members.some((member) => {
    if (!nonNullish(member)) return false;
    if (isResultLike(member, checker)) return true;
    if (checker.isArrayType(member) || checker.isTupleType(member)) {
      return carriesResult(member, checker, depth);
    }
    // PromiseFulfilledResult<Result>: { status: "fulfilled"; value: Result }
    const status = member.getProperty("status");
    const value = member.getProperty("value");
    return (
      status !== undefined &&
      value !== undefined &&
      isResultLike(checker.getTypeOfSymbol(value), checker)
    );
  });
}

/** A Result, or an array / tuple of Results (e.g. `items.map(validate)`,
 *  `await Promise.all(items.map(save))`, `Result.split(r)`), also nested
 *  and with `null` / `undefined` (`items?.map(validate)`). */
function carriesResult(
  type: ts.Type,
  checker: ts.TypeChecker,
  depth = 0
): boolean {
  const target = resolved(type, checker);
  if (isResultLike(target, checker)) return true;
  const members = nonNullishMembers(target);
  const [list] = members;
  if (
    members.length === 1 &&
    list !== undefined &&
    (checker.isArrayType(list) || checker.isTupleType(list))
  ) {
    if (depth >= MAX_ARRAY_DEPTH) return false;
    const elements = checker.getTypeArguments(list as ts.TypeReference);
    return elements.some((e) => elementCarriesResult(e, checker, depth + 1));
  }
  // A union of tuples, as `split` returns: every member is a tuple, and at
  // least one of them holds a Result.
  return (
    members.length > 1 &&
    members.every((m) => checker.isTupleType(m)) &&
    members.some((m) => carriesResult(m, checker, depth))
  );
}

/** `Promise<X>` where X carries a Result, or an array of such Promises
 *  (`items.map(save)`, also `items?.map(save)`). */
function promisesResult(
  type: ts.Type,
  checker: ts.TypeChecker,
  depth = 0
): boolean {
  const target = resolved(type, checker);
  const list = checker.getNonNullableType(target);
  if (checker.isArrayType(list) || checker.isTupleType(list)) {
    if (depth >= MAX_ARRAY_DEPTH) return false;
    const elements = checker.getTypeArguments(list as ts.TypeReference);
    return elements.some((e) => promisesResult(e, checker, depth + 1));
  }
  const awaited = checker.getAwaitedType(target);
  return (
    awaited !== undefined &&
    awaited !== target &&
    carriesResult(awaited, checker)
  );
}

/** A function type that returns a Result or a Promise of one, also an
 *  optional one (`onSave?: () => Promise<R>`). */
function returnsResult(type: ts.Type, checker: ts.TypeChecker): boolean {
  const signatures = checker.getNonNullableType(type).getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.some((s) => {
      const ret = s.getReturnType();
      return carriesResult(ret, checker) || promisesResult(ret, checker);
    })
  );
}

/** The parameter ignores what the callback returns: every call signature of
 *  its type returns `void` (e.g. `Array.prototype.forEach`). */
function ignoresReturn(type: ts.Type, checker: ts.TypeChecker): boolean {
  const signatures = checker.getNonNullableType(type).getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.every((s) => (s.getReturnType().flags & ts.TypeFlags.Void) !== 0)
  );
}

/** The type that `Result.tryCatch` / `Result.map` / `Maybe.map` give for a
 *  callback that returns a Promise: an object with one `never` property
 *  whose name says the function does not await.  It is never a correct
 *  value to have. */
function isNoAwaitBrand(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.isUnion() || type.isIntersection()) return false;
  const properties = type.getProperties();
  if (properties.length !== 1) return false;
  const [property] = properties;
  if (!property || !/^(Result|Maybe)\.\w+ does not await/.test(property.name)) {
    return false;
  }
  return (checker.getTypeOfSymbol(property).flags & ts.TypeFlags.Never) !== 0;
}

// ---------------------------------------------------------------------------
// must-use-result: stored or fresh
// ---------------------------------------------------------------------------

/** The library types whose `get` returns a stored entry. */
const MAP_TYPES = new Set(["Map", "ReadonlyMap", "WeakMap"]);

/** `accessor results: R[]`: TypeScript gives it a getter and a setter, and
 *  it stores its value as a field does. */
function isAutoAccessor(symbol: ts.Symbol): boolean {
  return (symbol.declarations ?? []).some(
    (d) =>
      ts.isPropertyDeclaration(d) &&
      (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Accessor) !== 0
  );
}

/** A getter that is not an auto-accessor field: it may build its value. */
function isGetter(symbol: ts.Symbol): boolean {
  return (
    (symbol.flags & ts.SymbolFlags.GetAccessor) !== 0 && !isAutoAccessor(symbol)
  );
}

/** The properties that `a.name`, `a["name"]` or `a[0]` reads, and `a[key]`
 *  with `key: "name"` or `key: "name" | "other"`; none for a key whose type
 *  names no property. */
function accessedProperties(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  checker: ts.TypeChecker
): ts.Symbol[] {
  const key = ts.isPropertyAccessExpression(node)
    ? node.name
    : node.argumentExpression;
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isStringLiteralLike(key) ||
    ts.isNumericLiteral(key)
  ) {
    const symbol = checker.getSymbolAtLocation(key);
    return symbol ? [symbol] : [];
  }
  const object = checker.getNonNullableType(
    checker.getTypeAtLocation(node.expression)
  );
  return literalNames(checker.getTypeAtLocation(key)).flatMap((name) => {
    const property = object.getProperty(name);
    return property ? [property] : [];
  });
}

/** A stored value: a name, `this`, `super`, a field of a stored value, or
 *  an entry that `Map.get` reads from a stored map, with `!`, casts,
 *  parentheses and optional chains around it.  A getter is stored only when
 *  its body just returns a stored value (`get last() { return this._last;
 *  }`): another may build a fresh value on every read.  A field of a value
 *  that a call makes (`getHolder().list`) is as fresh as that value.
 *
 *  `inGetter` checks that one returned value of a getter body, and checks
 *  it shallowly so that it does not recurse through getters: there only a
 *  name, `this` and their fields count, and a getter counts as fresh. */
function isStored(
  node: ts.Expression,
  program: ts.Program,
  inGetter = false
): boolean {
  const checker = program.getTypeChecker();
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    return isStored(node.expression, program, inGetter);
  }
  if (node.kind === ts.SyntaxKind.ThisKeyword || ts.isIdentifier(node)) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.SuperKeyword) return !inGetter;
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  ) {
    if (!isStored(node.expression, program, inGetter)) return false;
    return accessedProperties(node, checker).every((symbol) =>
      inGetter ? !isGetter(symbol) : isStoredProperty(symbol, program)
    );
  }
  if (ts.isCallExpression(node) && !inGetter) return isMapLookup(node, program);
  return false;
}

/** A property that holds its value: a field, an auto-accessor field
 *  (`accessor results: R[]`), or a getter whose body only returns a stored
 *  value (`get last() { return this._last; }`).  A getter without a body
 *  here (a declaration file, a type literal) may build a fresh value. */
function isStoredProperty(symbol: ts.Symbol, program: ts.Program): boolean {
  if (!isGetter(symbol)) return true;
  const getters = (symbol.declarations ?? []).filter(
    ts.isGetAccessorDeclaration
  );
  return (
    getters.length > 0 &&
    getters.every((getter) => {
      const statements = getter.body?.statements ?? [];
      const [only] = statements;
      return (
        statements.length === 1 &&
        only !== undefined &&
        ts.isReturnStatement(only) &&
        only.expression !== undefined &&
        isStored(only.expression, program, true)
      );
    })
  );
}

/** The name of `a.name`, `a["name"]` or `a[0]`, as `memberName` gives it
 *  for ESTree. */
function accessedName(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression
): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  const key = node.argumentExpression;
  return ts.isStringLiteral(key) || ts.isNumericLiteral(key)
    ? key.text
    : undefined;
}

/** `cache.get(key)` on a stored `Map`, `ReadonlyMap` or `WeakMap`.  A
 *  method named `get` of another type may build its value. */
function isMapLookup(node: ts.CallExpression, program: ts.Program): boolean {
  let callee: ts.Expression = node.expression;
  while (ts.isParenthesizedExpression(callee)) callee = callee.expression;
  if (
    !(
      ts.isPropertyAccessExpression(callee) ||
      ts.isElementAccessExpression(callee)
    ) ||
    accessedName(callee) !== "get" ||
    !isStored(callee.expression, program)
  ) {
    return false;
  }
  const declaration = program
    .getTypeChecker()
    .getResolvedSignature(node)?.declaration;
  const owner = declaration?.parent;
  return (
    owner !== undefined &&
    ts.isInterfaceDeclaration(owner) &&
    MAP_TYPES.has(owner.name.text) &&
    program.isSourceFileDefaultLibrary(owner.getSourceFile())
  );
}

// ---------------------------------------------------------------------------
// must-use-result: calls that hand back what they got
// ---------------------------------------------------------------------------

/** Calls whose value is the one they got, or a part of it.  The owner in
 *  each name is the type the call needs: an array receiver, a Promise
 *  receiver, the global `Object`, or a Result first argument.
 *
 *  `sort`, `reverse`, `fill` and `copyWithin` return their array;
 *  `shift`, `pop` and `splice` take elements out of it and return them,
 *  so `this.items.shift()` evicts an element that the array stored;
 *  `finally` returns a Promise that settles as its receiver does;
 *  `Object.freeze` / `seal` / `preventExtensions` return their argument;
 *  `inspect` / `inspectError` return the Result they got. */
const ARRAY_HANDS_BACK_RECEIVER = new Set([
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);
const ARRAY_HANDS_BACK_ELEMENTS = new Set(["shift", "pop", "splice"]);
const PROMISE_HANDS_BACK_RECEIVER = new Set(["finally"]);
const OBJECT_HANDS_BACK_ARGUMENT = new Set([
  "freeze",
  "seal",
  "preventExtensions",
]);
const RESULT_HANDS_BACK_ARGUMENT = new Set(["inspect", "inspectError"]);

/** `call` calls the function that the `Result` export of this library holds
 *  under `name`: the declaration of its signature is a function of the
 *  module that exports `Result`, and `Result[name]` has that signature. */
function isLibraryFunction(
  call: ts.CallExpression,
  name: string,
  checker: ts.TypeChecker
): boolean {
  const declaration = checker.getResolvedSignature(call)?.declaration;
  if (declaration === undefined || !ts.isFunctionDeclaration(declaration)) {
    return false;
  }
  const module = checker.getSymbolAtLocation(declaration.getSourceFile());
  const exported = module
    ? checker.getExportsOfModule(module).find((s) => s.name === "Result")
    : undefined;
  if (exported === undefined) return false;
  const result =
    (exported.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(exported)
      : exported;
  const property = checker.getTypeOfSymbol(result).getProperty(name);
  return (
    property !== undefined &&
    checker
      .getTypeOfSymbol(property)
      .getCallSignatures()
      .some((signature) => signature.getDeclaration() === declaration)
  );
}

// ---------------------------------------------------------------------------
// must-use-result: where a value is dropped
// ---------------------------------------------------------------------------

/** A value that a statement evaluates and drops.  `readByOperator` marks
 *  the left operand of `&&` / `||` / `??` and what it evaluates to: the
 *  operator reads it, so a stored Result there (`cached && send(cached)`)
 *  is used, while a fresh one is lost.  `casts` are the `as` / `<T>` casts
 *  around the value, outermost first: a value cast to a Result
 *  (`ipc.invoke("save") as Promise<Result<…>>`) is dropped as a Result
 *  too. */
type Part = {
  expression: TSESTree.Expression;
  readByOperator: boolean;
  casts: TSESTree.Expression[];
};

/** The values a dropped expression drops: every part of a sequence, both
 *  operands of `&&` / `||` / `??`, both branches of `?:`.  Every sequence
 *  it walks into goes to `sequences`, whose parts it has listed.
 *  `satisfies` keeps the type of its operand, so it is not a cast here.
 *
 *  It differs from `possibleValues` on purpose: a statement drops every
 *  part of a sequence and both operands of `&&`, while a returned sequence
 *  gives only its last part and a returned `&&` is one value. */
function discardedParts(
  discarded: TSESTree.Expression,
  sequences: WeakSet<TSESTree.SequenceExpression>,
  readByOperator = false
): Part[] {
  const casts: TSESTree.Expression[] = [];
  let expression = discarded;
  for (;;) {
    if (
      expression.type === AST_NODE_TYPES.TSAsExpression ||
      expression.type === AST_NODE_TYPES.TSTypeAssertion
    ) {
      casts.push(expression);
    } else if (expression.type !== AST_NODE_TYPES.TSSatisfiesExpression) {
      break;
    }
    expression = expression.expression;
  }
  switch (expression.type) {
    case AST_NODE_TYPES.SequenceExpression:
      sequences.add(expression);
      return expression.expressions.flatMap((part, i, all) =>
        discardedParts(part, sequences, i === all.length - 1 && readByOperator)
      );
    case AST_NODE_TYPES.LogicalExpression:
      return [
        ...discardedParts(expression.left, sequences, true),
        ...discardedParts(expression.right, sequences, readByOperator),
      ];
    case AST_NODE_TYPES.ConditionalExpression:
      return [
        ...discardedParts(expression.consequent, sequences, readByOperator),
        ...discardedParts(expression.alternate, sequences, readByOperator),
      ];
    default:
      return [{ expression, readByOperator, casts }];
  }
}

// ---------------------------------------------------------------------------
// must-use-result: callbacks
// ---------------------------------------------------------------------------

function isFunction(
  node: TSESTree.Node
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

/** A name or a member, also behind `!`, `?.` or a cast, which may refer to
 *  a function: `save`, `props.onSave`, `h!.click!`, `h?.click`. */
function isReference(node: TSESTree.Node): boolean {
  const inner = stripWrappers(node, { nonNull: true, chain: true });
  return (
    inner.type === AST_NODE_TYPES.Identifier ||
    inner.type === AST_NODE_TYPES.MemberExpression
  );
}

/** The values `expression` may give: either branch of `?:`, the last part
 *  of a sequence, what a cast holds.  So `(r) => (r.ok ? Result.inspect(r,
 *  log) : Result.inspectError(r, log))` returns one of two values. */
function possibleValues(
  expression: TSESTree.Expression
): TSESTree.Expression[] {
  const value = stripWrappers(expression) as TSESTree.Expression;
  switch (value.type) {
    case AST_NODE_TYPES.ConditionalExpression:
      return [
        ...possibleValues(value.consequent),
        ...possibleValues(value.alternate),
      ];
    case AST_NODE_TYPES.SequenceExpression: {
      const last = value.expressions[value.expressions.length - 1];
      return last === undefined ? [value] : possibleValues(last);
    }
    default:
      return [value];
  }
}

export const mustUseResult = createRule({
  name: "must-use-result",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow discarding a Result without reading it, since the error it carries would be silently lost.",
    },
    messages: {
      mustUse:
        "This Result is discarded. Read its `.ok`, pass it on, or return it — otherwise the error it carries is lost silently.",
      mustUseAsync:
        "This Promise resolves to a Result that is discarded. Await it and read its `.ok` — otherwise the error it carries is lost silently.",
      mustUseCallback:
        "This callback returns a Result, but the caller ignores the callback's return value — every error it returns is lost silently. Use a loop, or `map` and handle the Results.",
      noAwait:
        "This call gets a Promise from its callback but does not await it, so a rejection is lost. Use `Result.tryCatchAsync`, or await the value before `map`.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function isStoredReference(node: TSESTree.Node): boolean {
      return isStored(
        services.esTreeNodeToTSNodeMap.get(node) as ts.Expression,
        services.program
      );
    }

    // --- Calls that hand back what they got --------------------------------

    /** `results.sort(cmp)` → `results`, `Object.freeze(r)` → `r`,
     *  `Result.inspect(r, log)` → `r`, also in an optional chain
     *  (`this.results?.sort(cmp)`). */
    function handBackTarget(
      expression: TSESTree.Expression
    ): TSESTree.Expression | undefined {
      const node =
        expression.type === AST_NODE_TYPES.ChainExpression
          ? expression.expression
          : expression;
      if (
        node.type !== AST_NODE_TYPES.CallExpression ||
        node.callee.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return undefined;
      }
      const name = memberName(node.callee);
      if (name === undefined) return undefined;
      const receiver = node.callee.object;
      if (RESULT_HANDS_BACK_ARGUMENT.has(name)) {
        // `Result.inspect(r, log)` returns the Result it got; node's
        // `util.inspect(r)` returns a string, and an audit's `inspect(r)`
        // may build a new Result.
        const [arg] = node.arguments;
        if (
          arg &&
          arg.type !== AST_NODE_TYPES.SpreadElement &&
          isResultLike(services.getTypeAtLocation(arg), checker) &&
          isResultLike(services.getTypeAtLocation(node), checker) &&
          isLibraryFunction(
            services.esTreeNodeToTSNodeMap.get(node),
            name,
            checker
          )
        ) {
          return arg;
        }
        return undefined;
      }
      if (
        ARRAY_HANDS_BACK_RECEIVER.has(name) ||
        ARRAY_HANDS_BACK_ELEMENTS.has(name)
      ) {
        // `holder.list?.sort()` sorts a `R[] | undefined`.
        const type = checker.getNonNullableType(
          services.getTypeAtLocation(receiver)
        );
        if (checker.isArrayType(type) || checker.isTupleType(type)) {
          return receiver;
        }
      }
      if (PROMISE_HANDS_BACK_RECEIVER.has(name)) {
        const type = checker.getNonNullableType(
          services.getTypeAtLocation(receiver)
        );
        if (checker.getAwaitedType(type) !== type) return receiver;
      }
      if (
        OBJECT_HANDS_BACK_ARGUMENT.has(name) &&
        receiver.type === AST_NODE_TYPES.Identifier &&
        receiver.name === "Object"
      ) {
        const [arg] = node.arguments;
        if (arg && arg.type !== AST_NODE_TYPES.SpreadElement) return arg;
      }
      return undefined;
    }

    /** What `expression` hands back after the hand-back calls around it:
     *  `results.sort(cmp).reverse()` → `results`. */
    function handBackChain(
      expression: TSESTree.Expression
    ): TSESTree.Expression {
      let target = expression;
      for (
        let inner = handBackTarget(target);
        inner;
        inner = handBackTarget(target)
      ) {
        target = inner;
      }
      return target;
    }

    /** `expression` returns a stored value it got, so dropping its result
     *  loses nothing: `results.sort(cmp)`, `Result.inspect(r, log)`, and
     *  `await this.ready`, which gives the Result the stored Promise holds.
     *  `items.map(validate).sort(cmp)` still drops the Results of `map`.
     *  `await r` of a Result that is no Promise gives `r` itself, as `r;`
     *  does. */
    function returnsStored(expression: TSESTree.Expression): boolean {
      let awaited = expression;
      let awaitsPromise = false;
      while (awaited.type === AST_NODE_TYPES.AwaitExpression) {
        awaited = awaited.argument;
        const type = services.getTypeAtLocation(awaited);
        if (checker.getAwaitedType(type) !== type) awaitsPromise = true;
      }
      const target = handBackChain(awaited);
      return (target !== awaited || awaitsPromise) && isStoredReference(target);
    }

    // --- Where a value is dropped ------------------------------------------

    /** The sequences whose parts `discardedParts` has listed from where the
     *  whole sequence is dropped, or from a `void` that drops them on
     *  purpose: the `SequenceExpression` listener skips them. */
    const listedSequences = new WeakSet<TSESTree.SequenceExpression>();

    /** Report every Result that `discarded` evaluates and drops. */
    function checkDiscarded(discarded: TSESTree.Expression) {
      for (const { expression, readByOperator, casts } of discardedParts(
        discarded,
        listedSequences
      )) {
        // `r = getResult()` stores the Result; it does not discard it.
        if (expression.type === AST_NODE_TYPES.AssignmentExpression) {
          continue;
        }
        // `cached && send(cached)` reads the stored Result.
        if (readByOperator && isStoredReference(expression)) continue;
        if (returnsStored(expression)) continue;
        // `items.map(validate).sort(cmp)`: judge what `map` created, and
        // what each cast around it says.
        const types = [...casts, handBackChain(expression)].map((node) =>
          services.getTypeAtLocation(node)
        );
        const node = casts[0] ?? expression;
        if (types.some((type) => carriesResult(type, checker))) {
          context.report({ messageId: "mustUse", node });
        } else if (types.some((type) => promisesResult(type, checker))) {
          context.report({ messageId: "mustUseAsync", node });
        }
      }
    }

    // --- Callbacks ---------------------------------------------------------

    /** The type the caller expects for `callback`.  A method of an object
     *  literal, `{ on(n) { … } }`, is no expression to ask
     *  `getContextualType` about: its property in the type the object is
     *  expected to have. */
    function expectedType(callback: TSESTree.Node): ts.Type | undefined {
      const tsNode = services.esTreeNodeToTSNodeMap.get(callback);
      if (ts.isExpression(tsNode)) return checker.getContextualType(tsNode);
      if (
        !ts.isMethodDeclaration(tsNode) ||
        !ts.isObjectLiteralExpression(tsNode.parent)
      ) {
        return undefined;
      }
      const object = checker.getContextualType(tsNode.parent);
      const method = checker.getSymbolAtLocation(tsNode.name);
      if (!object || !method) return undefined;
      // A symbol key, `[Symbol.iterator]() { … }`, has an internal name
      // that `getProperty` does not find.
      const expected = checker.getNonNullableType(object);
      const property =
        expected.getProperty(method.name) ??
        expected
          .getProperties()
          .find((p) => p.escapedName === method.escapedName);
      return property && checker.getTypeOfSymbol(property);
    }

    /** The values `fn` returns: the body of a concise arrow, or what each
     *  `return` of a block body gives, not counting nested functions. */
    function returnedValues(
      fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
    ): TSESTree.Expression[] {
      if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return [fn.body];
      const values: TSESTree.Expression[] = [];
      const visit = (node: ts.Node): void => {
        if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
        if (ts.isReturnStatement(node) && node.expression) {
          // ESTree has no node for parentheses.
          let value: ts.Expression = node.expression;
          while (ts.isParenthesizedExpression(value)) value = value.expression;
          values.push(
            services.tsNodeToESTreeNodeMap.get(value) as TSESTree.Expression
          );
        }
        ts.forEachChild(node, visit);
      };
      ts.forEachChild(services.esTreeNodeToTSNodeMap.get(fn.body), visit);
      return values;
    }

    /** Every value `fn` returns is a stored value it hands back, as in
     *  `(r) => Result.inspect(r, log)` or `function (r) { return
     *  Object.freeze(r); }`, also from each branch of `?:`: dropping them
     *  loses nothing. */
    function returnsOnlyStored(
      fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression
    ): boolean {
      const values = returnedValues(fn);
      return (
        values.length > 0 &&
        values.every((value) => possibleValues(value).every(returnsStored))
      );
    }

    /** `callback` is passed where the caller ignores what it returns: as an
     *  argument for a parameter that returns `void`
     *  (`items.forEach(validate)`), as a JSX attribute (`onClick={() =>
     *  save()}`) or as a property of an object literal typed so. */
    function checkCallback(callback: TSESTree.Node) {
      const expected = expectedType(callback);
      if (!expected || !ignoresReturn(expected, checker)) return;
      if (!returnsResult(services.getTypeAtLocation(callback), checker)) return;
      // `(r) => Result.inspect(r, log)` returns the stored `r` it got.
      if (isFunction(callback) && returnsOnlyStored(callback)) return;
      context.report({ messageId: "mustUseCallback", node: callback });
    }

    function checkArguments(
      node: TSESTree.CallExpression | TSESTree.NewExpression
    ) {
      for (const arg of node.arguments) {
        if (arg.type !== AST_NODE_TYPES.SpreadElement) checkCallback(arg);
      }
    }

    /** A JSX attribute value or an object literal property worth checking
     *  as a callback: a function, or a reference whose type returns a
     *  Result.  The cheap type of the reference goes first, so a value that
     *  returns no Result never asks for the expected type (for JSX, the
     *  props of the element).  Any other value, such as a call that makes a
     *  handler (`onClick={makeHandler(id)}`), is not checked. */
    function checkCallbackValue(value: TSESTree.Node) {
      if (
        isFunction(value) ||
        (isReference(value) &&
          returnsResult(services.getTypeAtLocation(value), checker))
      ) {
        checkCallback(value);
      }
    }

    return {
      ExpressionStatement(node) {
        checkDiscarded(node.expression);
      },
      // `while ((validate(i), i < n))`: a comma drops every value but the
      // last, wherever the sequence is.  A sequence that `checkDiscarded`
      // already walked into is skipped, so its parts are not reported twice.
      SequenceExpression(node) {
        if (listedSequences.has(node)) return;
        for (const part of node.expressions.slice(0, -1)) {
          checkDiscarded(part);
        }
      },
      // `void (validate(1), 0)` drops the parts of its sequence on purpose:
      // list them so that the `SequenceExpression` listener skips them.
      UnaryExpression(node) {
        if (node.operator === "void") {
          discardedParts(node.argument, listedSequences);
        }
      },
      // `for (init; test; update)`: the values of init and update are
      // dropped as a statement's are.
      ForStatement(node) {
        if (
          node.init &&
          node.init.type !== AST_NODE_TYPES.VariableDeclaration
        ) {
          checkDiscarded(node.init);
        }
        if (node.update) checkDiscarded(node.update);
      },
      CallExpression(node) {
        checkArguments(node);
        if (isNoAwaitBrand(services.getTypeAtLocation(node), checker)) {
          context.report({ messageId: "noAwait", node });
        }
      },
      NewExpression: checkArguments,
      JSXExpressionContainer(node) {
        if (node.parent.type === AST_NODE_TYPES.JSXAttribute) {
          checkCallbackValue(node.expression);
        }
      },
      Property(node) {
        if (node.parent.type === AST_NODE_TYPES.ObjectExpression) {
          checkCallbackValue(node.value);
        }
      },
    };
  },
});

// ---------------------------------------------------------------------------
// no-unwrap
// ---------------------------------------------------------------------------

/** Functions that throw instead of returning the failure. */
const THROWING = new Set(["unwrap", "unwrapErr"]);

/** The declared names of those functions: an element taken out of an array
 *  (`const [take] = fns`) has no key to read the name from.
 *  This package declares `Maybe.unwrap` as `maybeUnwrap`. */
const THROWING_DECLARATIONS = new Set([...THROWING, "maybeUnwrap"]);

function declaredName(signature: ts.Signature): string | undefined {
  const declaration = signature.getDeclaration() as
    | ts.SignatureDeclaration
    | undefined;
  const name = declaration?.name;
  return name !== undefined && ts.isIdentifier(name) ? name.text : undefined;
}

/** A pattern that `checker.getTypeOfAssignmentPattern` can type: one that
 *  is assigned (`= value`, `for (… of list)`), or is nested in one.  The
 *  checker throws on any other, such as the inner one of `[...[a]] = list`. */
function isAssignedPattern(node: ts.Node): node is ts.AssignmentPattern {
  if (
    !ts.isObjectLiteralExpression(node) &&
    !ts.isArrayLiteralExpression(node)
  ) {
    return false;
  }
  const { parent } = node;
  if (ts.isForOfStatement(parent) || ts.isBinaryExpression(parent)) {
    return true;
  }
  if (ts.isPropertyAssignment(parent)) return isAssignedPattern(parent.parent);
  return ts.isArrayLiteralExpression(parent) && isAssignedPattern(parent);
}

/** A binding pattern in a parameter of a signature without a body: a
 *  function type, an interface member, an overload, a `declare` or
 *  abstract method.  It binds nothing. */
function isInSignature(pattern: ts.Node): boolean {
  let node = pattern.parent;
  while (
    ts.isBindingElement(node) ||
    ts.isObjectBindingPattern(node) ||
    ts.isArrayBindingPattern(node)
  ) {
    node = node.parent;
  }
  return (
    ts.isParameter(node) &&
    (node.parent as ts.FunctionLikeDeclaration).body === undefined
  );
}

/** A name that a destructuring pattern binds or assigns: `unwrap` in
 *  `{ unwrap }`, `{ k: unwrap = f }`, `[unwrap]` or `[...unwrap]`. */
function isPatternTarget(node: TSESTree.Node): boolean {
  let child = node;
  let parent = node.parent;
  while (
    parent &&
    ((parent.type === AST_NODE_TYPES.Property && parent.value === child) ||
      (parent.type === AST_NODE_TYPES.AssignmentPattern &&
        parent.left === child) ||
      parent.type === AST_NODE_TYPES.RestElement)
  ) {
    child = parent;
    parent = parent.parent;
  }
  return (
    parent?.type === AST_NODE_TYPES.ObjectPattern ||
    parent?.type === AST_NODE_TYPES.ArrayPattern
  );
}

export const noUnwrap = createRule({
  name: "no-unwrap",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `unwrap` / `unwrapErr` on a Result or Maybe, since they throw and take the failure out of the Result flow.",
    },
    messages: {
      noUnwrap:
        "`unwrap` throws on `Err` or `None`, and `unwrapErr` on `Ok`. Use `split`, `match` or `unwrapOr`, or return the failure.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    // --- Which name a key stands for ---------------------------------------

    /** The names a key may stand for: `unwrap`, `"unwrap"`, ``[`unwrap`]``,
     *  or `[key]` with `key: "unwrap"` or `key: "unwrap" | "unwrapOr"`, in
     *  a member (`Result[key]`) and in a destructuring pattern (`const {
     *  [key]: f } = Result`).  The checker gives a plain string key no
     *  literal type. */
    function keyNames(
      node: TSESTree.MemberExpression | TSESTree.Property
    ): string[] {
      const key =
        node.type === AST_NODE_TYPES.MemberExpression
          ? node.property
          : node.key;
      if (node.computed) {
        return literalNames(services.getTypeAtLocation(key));
      }
      switch (key.type) {
        case AST_NODE_TYPES.Identifier:
          return [key.name];
        case AST_NODE_TYPES.Literal:
          return [String(key.value)];
        default:
          return [];
      }
    }

    // --- Whether that name is a throwing function --------------------------

    /** One of `names` is a throwing function of `object`: a property
     *  named `unwrap` or `unwrapErr` that takes a Result or a Maybe. */
    function hasThrowing(object: ts.Type, names: string[]): boolean {
      const target = checker.getNonNullableType(object);
      return names.some((name) => {
        if (!THROWING.has(name)) return false;
        const property = target.getProperty(name);
        return (
          property !== undefined &&
          takesResultOrMaybe(checker.getTypeOfSymbol(property), checker)
        );
      });
    }

    /** A key that stands for `names` reads a throwing function: a property
     *  of `object`, the value it reads from, or else `value`, what the key
     *  reads, takes a Result or a Maybe (the property may come from an
     *  index signature, or the value from a default). */
    function readsThrowing(
      names: string[],
      object: ts.Type | undefined,
      value: TSESTree.Node | undefined
    ): boolean {
      if (!names.some((name) => THROWING.has(name))) return false;
      if (object !== undefined && hasThrowing(object, names)) return true;
      return (
        value !== undefined &&
        takesResultOrMaybe(services.getTypeAtLocation(value), checker)
      );
    }

    /** A function taken out of an array, `const [take] = fns`, is one of
     *  the throwing functions by its declared name. */
    function isThrowingFunction(element: ts.Type): boolean {
      // `noUncheckedIndexedAccess` adds `undefined` to the element.
      const type = checker.getNonNullableType(element);
      return (
        type.getCallSignatures().some((signature) => {
          const name = declaredName(signature);
          return name !== undefined && THROWING_DECLARATIONS.has(name);
        }) && takesResultOrMaybe(type, checker)
      );
    }

    // --- What a pattern takes apart ----------------------------------------

    /** The value a pattern takes apart: `Result` in `const { unwrap } =
     *  Result` and in `({ unwrap: f } = Result)`.  The target of an
     *  assignment keeps its own declared type, which says nothing of it. */
    function destructuredType(
      pattern: TSESTree.ObjectPattern | TSESTree.ArrayPattern
    ): ts.Type | undefined {
      const tsNode = services.esTreeNodeToTSNodeMap.get(pattern);
      if (
        ts.isObjectBindingPattern(tsNode) ||
        ts.isArrayBindingPattern(tsNode)
      ) {
        return checker.getTypeAtLocation(tsNode);
      }
      return isAssignedPattern(tsNode)
        ? checker.getTypeOfAssignmentPattern(tsNode)
        : undefined;
    }

    /** The type the element at `index` of an array pattern takes from
     *  `source`: the element type of an array, or that element of a tuple. */
    function elementType(source: ts.Type, index: number): ts.Type | undefined {
      const list = checker.getNonNullableType(source);
      if (!checker.isArrayType(list) && !checker.isTupleType(list)) {
        return undefined;
      }
      const elements = checker.getTypeArguments(list as ts.TypeReference);
      return checker.isArrayType(list) ? elements[0] : elements[index];
    }

    /** What a pattern with a default takes apart when the value is there:
     *  `fns` of the object in `{ fns: [take] = [] }`, the element of the
     *  array in `[[take] = []]`.  The type of the pattern itself is that of
     *  the default, or the two reduced to one. */
    function defaultedType(
      pattern: TSESTree.ArrayPattern
    ): ts.Type | undefined {
      const slot = pattern.parent;
      if (slot.type !== AST_NODE_TYPES.AssignmentPattern) return undefined;
      const holder = slot.parent;
      if (
        holder.type === AST_NODE_TYPES.Property &&
        holder.parent.type === AST_NODE_TYPES.ObjectPattern
      ) {
        const outer = destructuredType(holder.parent);
        const [name, ...more] = keyNames(holder);
        const property =
          outer && name !== undefined && more.length === 0
            ? checker.getNonNullableType(outer).getProperty(name)
            : undefined;
        return property && checker.getTypeOfSymbol(property);
      }
      if (holder.type === AST_NODE_TYPES.ArrayPattern) {
        const outer = destructuredType(holder);
        return outer && elementType(outer, holder.elements.indexOf(slot));
      }
      return undefined;
    }

    /** `unwrap` bound by destructuring is reported at the pattern: by a
     *  declaration (`const { unwrap } = Result`, a parameter) or by an
     *  assignment (`({ unwrap } = Result)`, `[take] = fns`). */
    function isDestructured(node: TSESTree.Identifier): boolean {
      const variable = context.sourceCode
        .getScope(node)
        .references.find(
          (reference) => reference.identifier === node
        )?.resolved;
      if (!variable) return false;
      return [
        ...variable.defs.map((def) => def.name),
        ...variable.references
          .filter((reference) => reference.isWrite())
          .map((reference) => reference.identifier),
      ].some(isPatternTarget);
    }

    return {
      MemberExpression(node) {
        const names = keyNames(node);
        if (!names.some((name) => THROWING.has(name))) return;
        // With a union key, `Result[key]` reads one of several properties,
        // and the type of the member mixes them: only the object tells.
        if (
          readsThrowing(
            names,
            services.getTypeAtLocation(node.object),
            names.length === 1 ? node : undefined
          )
        ) {
          context.report({ messageId: "noUnwrap", node });
        }
      },
      ArrayPattern(node) {
        if (isInSignature(services.esTreeNodeToTSNodeMap.get(node))) return;
        const sources = [destructuredType(node), defaultedType(node)];
        node.elements.forEach((element, index) => {
          const target =
            element?.type === AST_NODE_TYPES.AssignmentPattern
              ? element.left
              : element;
          if (
            target?.type !== AST_NODE_TYPES.Identifier &&
            target?.type !== AST_NODE_TYPES.MemberExpression
          ) {
            return;
          }
          const taken = sources.flatMap((source) => {
            const type = source && elementType(source, index);
            return type ? [type] : [];
          });
          // The target's own type covers another iterable, such as a Set.
          if (taken.length === 0)
            taken.push(services.getTypeAtLocation(target));
          if (taken.some(isThrowingFunction)) {
            context.report({ messageId: "noUnwrap", node: target });
          }
        });
      },
      Property(node) {
        if (node.parent.type !== AST_NODE_TYPES.ObjectPattern) return;
        const names = keyNames(node);
        if (
          !names.some((name) => THROWING.has(name)) ||
          isInSignature(services.esTreeNodeToTSNodeMap.get(node.parent))
        ) {
          return;
        }
        if (readsThrowing(names, destructuredType(node.parent), node.value)) {
          context.report({ messageId: "noUnwrap", node });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          THROWING.has(node.callee.name) &&
          !isDestructured(node.callee) &&
          readsThrowing([node.callee.name], undefined, node.callee)
        ) {
          context.report({ messageId: "noUnwrap", node: node.callee });
        }
        // `fns[0](r)` calls an element, as `const [take] = fns` takes one.
        const callee = stripWrappers(node.callee, { nonNull: true });
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.computed
        ) {
          const list = checker.getNonNullableType(
            services.getTypeAtLocation(callee.object)
          );
          if (
            (checker.isArrayType(list) || checker.isTupleType(list)) &&
            isThrowingFunction(services.getTypeAtLocation(callee))
          ) {
            context.report({ messageId: "noUnwrap", node: callee });
          }
        }
      },
    };
  },
});
