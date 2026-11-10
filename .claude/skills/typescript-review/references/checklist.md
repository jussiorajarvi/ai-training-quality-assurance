# TypeScript Review Checklist

Work through the sections in order. Each item names the guideline it comes from.

## 1. Correctness (highest priority)

- [ ] Each function does what its name and callers expect. Trace it with
      concrete values, including boundaries.
- [ ] Off-by-one errors: `<` vs `<=`, loop bounds, `length - 1`, modulo / wrap-around
      arithmetic (e.g. a position on a board of N squares).
- [ ] Comparison and assignment mistakes: `=` vs `==`/`===`, inverted conditions,
      `&&` vs `||`, missing `else`, fall-through in `switch` (no `break`). (`GTS`: always `===`, `!==`)
- [ ] State updates: is the right variable changed? Is state reset when it
      should be? Is shared mutable state changed by accident?
- [ ] Index access: arrays and maps indexed with a value that can be out of range
      or a key that can be missing. (`ETS #48`: `noUncheckedIndexedAccess`)
- [ ] Termination: loops and recursion always end. Win/exit conditions are
      reachable and checked at the right moment.
- [ ] Return values: the value returned means what callers think it means
      (e.g. "game should continue" vs "player has won").
- [ ] Randomness, time and I/O are handled so that behaviour is deterministic
      in tests (injectable).
- [ ] Numeric issues: integer vs float, `NaN`, division by zero, string/number mix-ups
      (`'5' + 1`).
- [ ] Copy-paste errors: duplicated blocks with one value not updated.

## 2. Type safety (Effective TypeScript, TS Handbook)

- [ ] `strict` mode is on, or at least `noImplicitAny` and `strictNullChecks`.
      (`ETS #2`, `TSH` tsconfig reference)
- [ ] No `any` where a real type is known; when unavoidable, keep it narrow and
      local, and prefer `unknown` for values of unknown type. (`ETS #5`, `#38`–`#44`, `TSH` Do's & Don'ts)
- [ ] No boxed types `String`, `Number`, `Boolean`, `Object`; use `string`, `number`,
      `boolean`, `object`. (`TSH` Do's & Don'ts, `ETS #10`)
- [ ] Avoid `Function` and `{}` as types; write explicit function signatures. (`TSH`, `GTS`)
- [ ] Prefer type declarations (`const x: T = …`) to type assertions (`as T`).
      No non-null assertion `!` without a guarantee. (`ETS #9`, `GTS` "Type and non-nullability assertions")
- [ ] Types represent only valid states: use unions / discriminated unions instead of
      several loosely related fields or boolean flags. (`ETS #28`, `#29`)
- [ ] String-literal unions or enums instead of magic strings (e.g. category names).
      (`ETS #33`; `GTS` prefers enums / literal unions over raw strings)
- [ ] Parallel arrays (`names[]`, `places[]`, `purses[]` indexed by the same `i`)
      replaced by an array of objects / a class. (`ETS #28`, `CC` Data Structures)
- [ ] `null`/`undefined` pushed to the perimeter of types, not scattered. (`ETS #31`)
- [ ] Function signatures: explicit return types on exported/public functions;
      don't use `?` optional params where overloads/unions are clearer;
      callbacks returning ignored values typed `void`. (`TSH` Do's & Don'ts, `GTS`)
- [ ] `readonly` for values that must not change; `const` over `let`; never `var`. (`ETS #17`, `GTS`)
- [ ] Inference used where it is obvious; no redundant annotations on trivially
      inferred locals. (`ETS #19`, `GTS` "Type inference")

## 3. Error handling (Clean Code ch.7, Google style)

- [ ] Errors are not swallowed (`catch {}` with no handling or rethrow).
- [ ] Throw `Error` objects (`throw new Error(…)`), never strings. (`GTS` "Exceptions")
- [ ] Invalid input is rejected at the boundary (e.g. adding too many players,
      rolling before enough players exist).
- [ ] Don't return `null` or pass `null` where an exception or a result type is
      clearer. (`CC` ch.7)
- [ ] `catch (e)` treats `e` as `unknown` and narrows it. (`ETS`, `TSH` 4.4+ `useUnknownInCatchVariables`)

## 4. Design and readability (Clean Code / SOLID)

- [ ] **Small functions that do one thing**; one level of abstraction per function.
      Long `if/else` chains or methods over ~20–30 lines are candidates to split. (`CC` ch.3)
- [ ] **No side effects hidden behind a query-like name**; command/query separation.
      (`CC` ch.3)
- [ ] **DRY**: duplicated logic (e.g. two near-identical branches for correct-answer
      handling) extracted. (`CC` ch.17 G5)
- [ ] **Intention-revealing names**: no abbreviations or misleading names; booleans read as
      predicates (`isInPenaltyBox`); functions are verbs. (`CC` ch.2, `GTS` "Naming")
- [ ] **Magic numbers** replaced by named constants (board size, winning score,
      number of questions, max players). (`CC` ch.17 G25)
- [ ] **Single Responsibility**: game rules, question generation, and console output
      are separate. Output goes through an injectable logger / port, not
      `console.log` sprinkled through domain logic. (`CC` SRP, ch.10)
- [ ] **Open/Closed**: adding a category / rule does not require editing several
      `if` chains; use a lookup table or map. (`CC` OCP, `CC` ch.17 G23 "Prefer polymorphism to if/else")
- [ ] Encapsulation: fields are `private`/`readonly` where possible; no public mutable state.
      (`GTS` "Visibility", `CC` ch.6)
- [ ] Comments explain *why*, not *what*; no commented-out code. (`CC` ch.4)
- [ ] Dead code and unused variables / imports removed. (`CC` ch.17 G9, `GTS`)
- [ ] Testability: dependencies (randomness, I/O, clock) are injected. (`CC` ch.9)

## 5. Google TypeScript Style Guide — conventions

- [ ] Naming: `UpperCamelCase` for classes, interfaces, types, enums;
      `lowerCamelCase` for variables, functions, methods, properties;
      `CONSTANT_CASE` for module-level constants. No `_` prefix/suffix for privates.
      No `I` prefix on interfaces.
- [ ] ES module `import`/`export`; named exports, no default exports; no `namespace`.
- [ ] `===`/`!==` only (except `== null`).
- [ ] No `var`; `const` by default.
- [ ] No `#private` fields; use TS `private`. Parameter properties for simple
      constructor injection.
- [ ] Use `for…of` for arrays; don't use `for…in` on arrays.
- [ ] Template literals over string concatenation for complex strings.
- [ ] Prefer interfaces for object shapes; type aliases for unions.
- [ ] Use `Array<T>` for complex element types, `T[]` for simple ones.
- [ ] Don't use `@ts-ignore`; use `@ts-expect-error` with a reason only in tests.

## 6. Tests

- [ ] Tests verify observable behaviour (state, return values, output), not that
      a mock/stub was called.
- [ ] A plausible bug in the implementation would make at least one test fail.
- [ ] Edge cases covered: boundaries, invalid input, wrap-around, win condition.
- [ ] Tests are deterministic (seeded/injected randomness, no reliance on timing).
- [ ] One concept per test; clear Arrange-Act-Assert; descriptive names. (`CC` ch.9 F.I.R.S.T.)
- [ ] Snapshot / "golden master" tests are not the only safety net: say what they
      cannot catch.

## 7. Tooling and configuration

- [ ] TypeScript and dependencies are reasonably current; flag very old compiler
      versions that block modern safety features.
- [ ] A `tsconfig.json` exists with `strict: true`.
- [ ] A linter (ESLint with `@typescript-eslint`) / formatter is configured. (`GTS` recommends `gts`)
