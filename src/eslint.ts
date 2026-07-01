import { ESLintUtils } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/semyonf/kamchazky#${name}`
);

function isResultMember(type: ts.Type, checker: ts.TypeChecker): boolean {
  const ok = type.getProperty("ok");
  if (!ok) return false;

  const okType = checker.getTypeOfSymbol(ok);
  const isBooleanDiscriminant =
    (okType.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.Boolean)) !== 0;
  if (!isBooleanDiscriminant) return false;

  return Boolean(type.getProperty("value") ?? type.getProperty("error"));
}

function isResultLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.isUnion()) {
    return (
      type.types.length > 0 &&
      type.types.every((member) => isResultMember(member, checker))
    );
  }

  return isResultMember(type, checker);
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

export default {
  meta: { name: "@semyonf/kamchazky" },
  rules: { "must-use-result": mustUseResult },
};
