// A CommonJS consumer that re-exports and extends the library, compiled with
// `declaration: true`.  Every inferred type below must be nameable in the
// emitted .d.ts, through the package's own exports.
import { Maybe, Result } from "@semyonf/kamchazky";

export const AppResult = { ...Result, fromAxios: (x: unknown) => Result.ok(x) };
export const AppMaybe = { ...Maybe, fromEmpty: () => Maybe.none() };
export const { map, flatMap, orElse, flatten, transpose, match } = Result;
export const { all, collect, allAsync, split, tryCatch, unwrap } = Result;
export const {
  map: mapMaybe,
  flatMap: flatMapMaybe,
  all: allMaybe,
  firstSome,
} = Maybe;
export const myFlatten = Result.flatten;
export const lib = { Result, Maybe };
export function wrap<T>(f: () => T) {
  return Result.tryCatch(f);
}
