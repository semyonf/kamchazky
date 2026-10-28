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

  const propertyType = checker.getTypeOfSymbol(property);
  return (
    (propertyType.flags &
      (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.Boolean)) !==
    0
  );
}

function isResultMember(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (!hasBooleanProperty(type, "ok", checker)) return false;

  return Boolean(type.getProperty("value") ?? type.getProperty("error"));
}

function isMaybeMember(type: ts.Type, checker: ts.TypeChecker): boolean {
  return hasBooleanProperty(type, "some", checker);
}

function everyMember(
  type: ts.Type,
  isMember: (member: ts.Type) => boolean
): boolean {
  if (type.isUnion()) {
    return type.types.length > 0 && type.types.every(isMember);
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
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();

    return {
      ExpressionStatement(node) {
        const type = services.getTypeAtLocation(node.expression);
        if (isResultLike(type, checker)) {
          context.report({ messageId: "mustUse", node: node.expression });
        }
      },
    };
  },
});

export const noUnwrap = createRule({
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

export default {
  meta: { name: "@semyonf/kamchazky" },
  rules: { "must-use-result": mustUseResult, "no-unwrap": noUnwrap },
};
