// The same from a CommonJS config.
import kamchazky = require("@semyonf/kamchazky/eslint");

import type { ESLint, Linter } from "eslint";

export const viaLinter: Linter.Config[] = [{ plugins: { kamchazky } }];
export const asPlugin: ESLint.Plugin = kamchazky;
