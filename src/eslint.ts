import {
  AST_NODE_TYPES,
  ESLintUtils,
  type TSESTree,
} from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semyonf/kamchazky#${name}`
);

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

const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined;

function everyMember(
  type: ts.Type,
  isMember: (member: ts.Type) => boolean
): boolean {
  if (type.isUnion()) {
    // Ignore null/undefined members so `Result<T, E> | null` is still caught.
    const members = type.types.filter((m) => (m.flags & NULLISH) === 0);
    return members.length > 0 && members.every(isMember);
  }

  return isMember(type);
}

function isResultLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  return everyMember(type, (member) => isResultMember(member, checker));
}

function isMaybeLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  const members = type.isUnion() ? type.types : [type];
  return (
    everyMember(type, (member) => isMaybeMember(member, checker)) &&
    members.some((member) => Boolean(member.getProperty("value")))
  );
}

function takesResultOrMaybe(type: ts.Type, checker: ts.TypeChecker): boolean {
  return type.getCallSignatures().some((signature) => {
    const [first] = signature.getParameters();
    if (!first) return false;

    const parameterType = checker.getTypeOfSymbol(first);
    return (
      isResultLike(parameterType, checker) ||
      isMaybeLike(parameterType, checker)
    );
  });
}

function memberName(node: TSESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
    return node.property.name;
  }
  if (node.computed && node.property.type === AST_NODE_TYPES.Literal) {
    return String(node.property.value);
  }
  return undefined;
}

/** A Result, or an array / tuple of Results (e.g. `items.map(validate)` or
 *  `await Promise.all(items.map(save))`). */
function carriesResult(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (isResultLike(type, checker)) return true;
  if (checker.isArrayType(type)) {
    const [element] = checker.getTypeArguments(type as ts.TypeReference);
    return element !== undefined && isResultLike(element, checker);
  }
  if (checker.isTupleType(type)) {
    const elements = checker.getTypeArguments(type as ts.TypeReference);
    return (
      elements.length > 0 && elements.every((e) => isResultLike(e, checker))
    );
  }
  return false;
}

/** `Promise<X>` where X carries a Result. */
function promisesResult(type: ts.Type, checker: ts.TypeChecker): boolean {
  const awaited = checker.getAwaitedType(type);
  return (
    awaited !== undefined && awaited !== type && carriesResult(awaited, checker)
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

function returnsResult(type: ts.Type, checker: ts.TypeChecker): boolean {
  const signatures = type.getCallSignatures();
  return (
    signatures.length > 0 &&
    signatures.some((s) => {
      const ret = s.getReturnType();
      return carriesResult(ret, checker) || promisesResult(ret, checker);
    })
  );
}

/** Array methods that return their receiver, and `Object.*` functions that
 *  return their argument.  The value they return is the one they got. */
const RETURNS_RECEIVER = new Set(["sort", "reverse", "fill", "copyWithin"]);
const RETURNS_ARGUMENT = new Set(["freeze", "seal", "preventExtensions"]);

/** A stored value: discarding a reference to it loses nothing. */
function isReference(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.Identifier ||
    node.type === AST_NODE_TYPES.MemberExpression ||
    node.type === AST_NODE_TYPES.ThisExpression ||
    (node.type === AST_NODE_TYPES.TSNonNullExpression &&
      isReference(node.expression))
  );
}

/** A sequence expression discards every sub-expression, including the last
 *  one (the whole statement is itself discarded), so check them all. */
function flattenSequence(
  expression: TSESTree.Expression
): TSESTree.Expression[] {
  return expression.type === AST_NODE_TYPES.SequenceExpression
    ? expression.expressions.flatMap(flattenSequence)
    : [expression];
}

const mustUseResult = createRule({
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
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function checkArguments(
      node: TSESTree.CallExpression | TSESTree.NewExpression
    ) {
      for (const arg of node.arguments) {
        if (arg.type === AST_NODE_TYPES.SpreadElement) continue;
        const tsNode = services.esTreeNodeToTSNodeMap.get(arg);
        const expected = checker.getContextualType(tsNode as ts.Expression);
        if (!expected || !ignoresReturn(expected, checker)) continue;
        if (returnsResult(services.getTypeAtLocation(arg), checker)) {
          context.report({ messageId: "mustUseCallback", node: arg });
        }
      }
    }

    /** `results.sort(cmp)` → `results`, `Object.freeze(r)` → `r`. */
    function identityTarget(
      node: TSESTree.Expression
    ): TSESTree.Expression | undefined {
      if (
        node.type !== AST_NODE_TYPES.CallExpression ||
        node.callee.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return undefined;
      }
      const name = memberName(node.callee);
      if (name === undefined) return undefined;
      const receiver = node.callee.object;
      if (RETURNS_RECEIVER.has(name)) {
        const type = services.getTypeAtLocation(receiver);
        if (checker.isArrayType(type) || checker.isTupleType(type)) {
          return receiver;
        }
      }
      if (
        RETURNS_ARGUMENT.has(name) &&
        receiver.type === AST_NODE_TYPES.Identifier &&
        receiver.name === "Object"
      ) {
        const [arg] = node.arguments;
        if (arg && arg.type !== AST_NODE_TYPES.SpreadElement) return arg;
      }
      return undefined;
    }

    return {
      ExpressionStatement(node) {
        for (const expression of flattenSequence(node.expression)) {
          // `r = getResult()` stores the Result; it does not discard it.
          if (expression.type === AST_NODE_TYPES.AssignmentExpression) {
            continue;
          }
          // `results.sort(cmp)` hands back the same array: judge `results`.
          // A stored array loses nothing; `items.map(validate).sort(cmp)`
          // still drops the Results that `map` created.
          let target: TSESTree.Expression = expression;
          for (
            let inner = identityTarget(target);
            inner;
            inner = identityTarget(target)
          ) {
            target = inner;
          }
          if (target !== expression && isReference(target)) continue;
          const type = services.getTypeAtLocation(target);
          if (carriesResult(type, checker)) {
            context.report({ messageId: "mustUse", node: expression });
          } else if (promisesResult(type, checker)) {
            context.report({ messageId: "mustUseAsync", node: expression });
          }
        }
      },
      CallExpression: checkArguments,
      NewExpression: checkArguments,
    };
  },
});

const noUnwrap = createRule({
  name: "no-unwrap",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `unwrap` on a Result or Maybe, since it throws on `Err` or `None` and takes the failure out of the Result flow.",
    },
    messages: {
      noUnwrap:
        "`unwrap` throws on `Err` or `None`. Use `split`, `match` or `unwrapOr`, or return the failure.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    function reportIfUnwrap(node: TSESTree.Node) {
      const type = services.getTypeAtLocation(node);
      if (takesResultOrMaybe(type, checker)) {
        context.report({ messageId: "noUnwrap", node });
      }
    }

    return {
      MemberExpression(node) {
        if (memberName(node) === "unwrap") reportIfUnwrap(node);
      },
      CallExpression(node) {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === "unwrap"
        ) {
          reportIfUnwrap(node.callee);
        }
      },
    };
  },
});

// The plugin object is the module's only export, so the CommonJS build can
// set `module.exports` to it (tsup `cjsInterop`) and `require()` returns the
// plugin itself instead of `{ default, ... }`.
const plugin = {
  meta: { name: "@semyonf/kamchazky" },
  rules: { "must-use-result": mustUseResult, "no-unwrap": noUnwrap },
};

export default plugin;
