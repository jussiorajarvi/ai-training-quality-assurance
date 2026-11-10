# TypeScript Review Findings

**Scope:** `app/src/game.ts`, `app/src/game-runner.ts`, `app/tests/game-runner.test.ts`, `app/package.json` (plus `app/master.txt` as evidence)
**TypeScript version / strictness:** 2.9.2 (`package-lock.json`); no `tsconfig.json`, so compiler defaults apply: `strict` off, target ES5, ES5 lib
**Summary:** The game has real correctness bugs. Player 1 is set up with the wrong array index, so they can never move or win. A player who goes to the penalty box never leaves it. With a single player the game never ends. The question decks run out and print `undefined`. The only test is a golden master that records this broken behaviour (`NaN` shows up 113 times in `master.txt`), and it reports 100 % coverage while catching none of these bugs. Design problems (parallel arrays, `console.log` inside the domain class, duplicated code, a function whose name says the opposite of what it returns) make these bugs easy to add and hard to see. The toolchain is very old and its parts don't fit together: `tsc` cannot even type-check the project.

| # | Severity | Title | Location | Guideline |
|---|----------|-------|----------|-----------|
| 1 | Critical | `add()` sets up the wrong array index, so the first player is stuck at `NaN` | app/src/game.ts:29-33 | CC ch.17 G5 / ETS #28 |
| 2 | Critical | Game never ends with a single player, and with no players it loops on `undefined` | app/src/game.ts:29, 112-165; app/src/game-runner.ts:15-25 | CC ch.7 (validate at boundary) |
| 3 | High | A player in the penalty box is never let out | app/src/game.ts:49-65, 119, 128 | CC ch.3 |
| 4 | High | Question decks run out and print `undefined` | app/src/game.ts:17-22, 79-88 | ETS #48 |
| 5 | High | Golden-master test locks in the bugs and can't catch regressions in logic | app/tests/game-runner.test.ts:28-37; app/master.txt | CC ch.9 |
| 6 | High | Importing `game-runner.ts` runs a full random game (side effect in tests) | app/src/game-runner.ts:29 | CC ch.3 (side effects) / GTS modules |
| 7 | High | Toolchain is broken and outdated: `tsc` 2.9 can't parse `@types/node` 17, no `tsconfig`, no strict mode | app/package.json:31-41 | ETS #2 / TSH tsconfig |
| 8 | Medium | `didPlayerWin()` returns `true` when the player has *not* won; return values mean different things | app/src/game.ts:112-125; app/src/game-runner.ts:14-25 | CC ch.2 / CC ch.3 |
| 9 | Medium | `roll()` input is never checked; wrap-around only works for rolls ≤ 12 | app/src/game.ts:45, 54-57, 68-71 | CC ch.7 / CC ch.17 G25 |
| 10 | Medium | Parallel arrays for player state, magic strings for categories | app/src/game.ts:3-13, 80-110 | ETS #28, #33 / CC Data Structures |
| 11 | Medium | Duplicated move, correct-answer and next-player code | app/src/game.ts:54-61 vs 68-75; 130-140 vs 151-163; 121-123, 136-138, 142-144, 159-161 | CC ch.17 G5 (DRY) |
| 12 | Medium | Game rules mixed with console output; no way to inject output | app/src/game.ts (35, 36, 46, 47, …) | CC SRP, ch.10 |
| 13 | Medium | Long methods and `if` chains that break Open/Closed | app/src/game.ts:45-77, 79-110, 127-165 | CC ch.3 / OCP / G23 |
| 14 | Low | Style: `==`/`!=`, `var`, string concatenation, `Array<T>`, redundant annotations, missing return types, typo | app/src/game.ts (various); app/src/game-runner.ts:8, 14, 19 | GTS / ETS #19 |
| 15 | Low | Commented-out test, unused dependency, test writes into the working directory | app/tests/game-runner.test.ts:28-30, 33-35; app/package.json:39 | CC ch.4 / G9 |

## Findings

### 1. `add()` sets up the wrong array index, so the first player is stuck at `NaN` — Critical
- **Location:** `app/src/game.ts:29-33`
- **Guideline:** `CC ch.17` (logic errors from parallel structures) / `ETS #28`: use types that only allow valid states. Parallel arrays let indexes drift apart.
- **Problem:** `players.push(name)` runs *before* `places[howManyPlayers()]`, `purses[...]` and `inPenaltyBox[...]` are set. Player *i* is stored at index `i`, but their state goes to index `i + 1`. So `places[0]` and `purses[0]` stay `undefined`. Then `undefined + roll` gives `NaN`, and `undefined += 1` gives `NaN`. `NaN` never equals any board position, so the first player always lands on "Rock". `NaN == 6` is never true, so **the first player can never win**.
- **Evidence / scenario (fact):** `master.txt` line 9: `Chet's new location is NaN`. `NaN` appears 113 times. In all 10 recorded games the winner is Sue or Pat, never Chet. Running `add('A'); add('B'); roll(1)` prints `A's new location is NaN`.
- **Recommendation:** Set up the state before or together with the push. Better, store each player as one object (see #10):
  ```ts
  this.players.push({ name, place: 0, purse: 0, inPenaltyBox: false });
  ```
  Then generate a new golden master, because the current one records this bug (#5).

### 2. Game never ends with a single player, and with no players it loops on `undefined` — Critical
- **Location:** `app/src/game.ts:29` (no checks), `112-165`; `app/src/game-runner.ts:15-25`
- **Guideline:** `CC ch.7`: reject invalid input at the boundary.
- **Problem:** Nothing checks how many players there are. Because of #1, a lone player (index 0) has a `NaN` purse and can never win, so any loop that waits for a winner, like `GameRunner`, runs forever. With no players, `players[0]` is `undefined`, the turn index goes to 1 and never equals `players.length` (0) again, and every turn prints `undefined is the current player`. Real trivia needs at least 2 players, and the original kata allows at most 6. Neither limit is checked.
- **Evidence / scenario (fact):** I ran a single-player game for 1,000 correct answers: `wasCorrectlyAnswered()` still returned `true` and printed `Solo now has NaN Gold Coins.`. A game with no players printed `undefined is the current player` / `undefined's new location is NaN`.
- **Recommendation:** Throw `new Error(...)` from `add()` when the game is full, and from `roll()` when fewer than 2 players have joined (or add an explicit `start()`). Fix #1. Use `>=` and modulo for moving to the next player: `this.currentPlayer = (this.currentPlayer + 1) % this.players.length`.

### 3. A player in the penalty box is never let out — High
- **Location:** `app/src/game.ts:49-65`, `119`, `128`
- **Guideline:** `CC ch.3`: a function should do what its name says. "Getting out of the penalty box" should change state.
- **Problem:** `inPenaltyBox[i]` is set to `true` on line 119, and no code ever sets it back to `false`. An odd roll sets the shared flag `isGettingOutOfPenaltyBox`, but the player stays in the box. So on every later turn they need an odd roll again, and an even roll loses the turn. The message "is getting out of the penalty box" is misleading.
  A related problem: when the player stays in the box (even roll), no question is asked. But the runner still calls `wrongAnswer()`/`wasCorrectlyAnswered()`, which prints "Question was incorrectly answered … was sent to the penalty box" for a question that was never asked.
- **Evidence / scenario (fact):** Two players both answer wrong. B then rolls 3 ("B is getting out of the penalty box") and answers correctly. On B's next turn, a roll of 2 prints `B is not getting out of the penalty box`.
- **Recommendation:** When a player rolls odd while in the box, set `inPenaltyBox[i] = false` (or make "in box" a per-player state, see #10). Make `roll()` report whether a question was asked, so the caller only takes an answer when there was a question. *Note:* the original legacy kata has this same behaviour. Whether to fix it is a product decision, but it should be decided on purpose and covered by a test, not left hidden.

### 4. Question decks run out and print `undefined` — High
- **Location:** `app/src/game.ts:17-22`, `79-88`
- **Guideline:** `ETS #48`: `noUncheckedIndexedAccess` / treat taking from a collection as possibly `undefined`.
- **Problem:** Each category has exactly 50 questions, and `shift()` takes them off for good. After 50, `shift()` returns `undefined`, and the type checker can't see this because the return type is `string` under TS 2.9 without strict.
- **Evidence / scenario (fact):** A single-player game (player always on "Rock" because of #1) ran 60 turns and printed `undefined` as the question 10 times. With #1 and #2 together, a real game can run long enough for this to happen.
- **Recommendation:** Cycle through the questions (`questions[index % questions.length]`) or refill the deck, and handle running out explicitly. Replace the magic number `50` with a named constant.

### 5. Golden-master test locks in the bugs and can't catch regressions in logic — High
- **Location:** `app/tests/game-runner.test.ts:28-37`; `app/master.txt`
- **Guideline:** `CC ch.9` (F.I.R.S.T., one concept per test). The checklist says snapshot tests must not be the only safety net.
- **Problem:** The only test compares the full console output of 10 seeded games with `master.txt`. That file was generated from the buggy code, so it records `NaN` positions, a first player who can never win, and the typo "corrent". It has these limits:
  - It **passes with 100 % statement/branch coverage** (verified with `npm test`) while bugs #1–#4 are present. Coverage here says nothing about correctness.
  - Every intended fix (e.g. #1) breaks it, so it can't tell a fix from a regression.
  - The seeds only ever run 3 players and rolls 1–6. Single player, no players, more than 6 players, deck exhaustion and invalid rolls are never tried.
  - `console.log` is replaced without `try/finally` (lines 18-25). If `runProgram` throws, the logger stays replaced for every later test.
  - When it fails, the message is a diff of two 1,360-line strings, which doesn't show the cause.
- **Recommendation:** Keep the golden master only as a temporary safety net while refactoring. Add focused unit tests for `Game`: adding players, moving and wrap-around (positions 11 → 0), category for each square, earning coins, winning at 6, entering and leaving the penalty box, deck exhaustion, rejecting invalid player counts and rolls. Restore `console.log` in `finally` (or inject a logger, see #12).

### 6. Importing `game-runner.ts` runs a full random game (side effect in tests) — High
- **Location:** `app/src/game-runner.ts:29`
- **Guideline:** `CC ch.3` (no hidden side effects); `GTS` (modules should not do work when imported).
- **Problem:** `GameRunner.main()` runs at module level. The test imports `GameRunner`, so every test run first plays an extra game with `Math.random`, which isn't seeded, and prints it to stdout. This makes the test output nondeterministic and noisy. It also means any game that never ends (#2) would hang the test suite on import.
- **Evidence / scenario (fact):** `npm test` prints a full random game (e.g. "Sue now has 6 Gold Coins.") before `✔ master output and new output match`, and the text changes between runs.
- **Recommendation:** Move the entry point to its own file (e.g. `src/main.ts`) or guard it with `if (require.main === module) GameRunner.main();`. Point `npm start` at that entry point.

### 7. Toolchain is broken and outdated: `tsc` 2.9 can't parse `@types/node` 17, no `tsconfig`, no strict mode — High
- **Location:** `app/package.json:31-41`; no `app/tsconfig.json`
- **Guideline:** `ETS #2` (know which compiler options you use; turn on `strict`); `TSH` tsconfig reference; checklist §7.
- **Problem:**
  - TypeScript 2.9.2 (2018) is installed with `@types/node` 17, which uses newer syntax. `npx tsc --noEmit src/*.ts` fails with dozens of `TS1144`/`TS1005` parse errors in `node_modules/@types/node`. The project can't be type-checked. Tests only run because ts-node 7 compiles each file on its own.
  - `typescript` is under `dependencies` instead of `devDependencies`.
  - Without a `tsconfig.json`, the code uses target/lib ES5: even `String.prototype.includes` doesn't compile. `strict`, `noImplicitAny` and `strictNullChecks` are off.
  - TS 2.9 doesn't have features the fixes would benefit from: `unknown` (3.0), `as const` (3.4), `?.`/`??` (3.7), `noUncheckedIndexedAccess` (4.1), `satisfies` (4.9). The recommendations in this report stick to what 2.9 supports, or say where an upgrade is needed.
  - No linter or formatter is configured.
- **Recommendation:** Upgrade to a current TypeScript (5.x), ts-node (or `tsx`) and matching `@types/node`. Add a `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true` and a modern `target`/`lib`. Add ESLint with `@typescript-eslint` (or `gts`). Drop `sinon`, which is unused (see #15).

### 8. `didPlayerWin()` returns `true` when the player has *not* won; return values mean different things — Medium
- **Location:** `app/src/game.ts:112-114`, `116-125`, `127-165`; `app/src/game-runner.ts:14-25`
- **Guideline:** `CC ch.2` (intention-revealing names); `CC ch.3` (command/query separation).
- **Problem:** `didPlayerWin()` returns `!(purse == 6)`, which is "game should continue", the opposite of its name. `wasCorrectlyAnswered()` sounds like a query but is a command that changes the purse and the current player, and returns "not a winner". `wrongAnswer()` always returns `true`, and `add()` always returns `true`. The runner only works because it calls the result `notAWinner`. Anyone who trusts the method name will get the logic backwards. (Judgement call on naming; the inverted meaning is a fact.)
- **Recommendation:** Rename to `hasPlayerWon()` and return `purse >= WINNING_COINS`. Make `correctAnswer()`/`wrongAnswer()` return `void`, and add a query such as `get winner(): string | undefined` or `isOver(): boolean`. Make `add()` return `void`.

### 9. `roll()` input is never checked; wrap-around only works for rolls ≤ 12 — Medium
- **Location:** `app/src/game.ts:45`, `54-57`, `68-71`
- **Guideline:** `CC ch.7` (check input at the boundary); `CC ch.17 G25` (magic numbers).
- **Problem:** `roll` accepts any `number`. Wrap-around subtracts 12 only once, so a roll of 25 from position 0 gives position 13, which isn't on the board and gets "Rock". Negative numbers, zero and fractions are also accepted. Odd/even penalty logic with `-3 % 2 === -1` happens to work, but only by luck. `11` and `12` are magic numbers.
- **Recommendation:** Check `Number.isInteger(roll) && roll >= 1 && roll <= 6` and throw otherwise. Use `const BOARD_SIZE = 12` with `place = (place + roll) % BOARD_SIZE`.

### 10. Parallel arrays for player state, magic strings for categories — Medium
- **Location:** `app/src/game.ts:3-13`, `80-110`
- **Guideline:** `ETS #28` (types that only allow valid states); `ETS #33` (string-literal unions instead of `string`); `CC` Data Structures.
- **Problem:** `players`, `places`, `purses` and `inPenaltyBox` are kept in sync only by index. That is exactly what made #1 possible. `isGettingOutOfPenaltyBox` is one flag shared by all players, though it describes the current turn. Categories are plain `string`s compared with `==`, so a typo like `'Sport'` would compile and quietly ask no question.
- **Recommendation:**
  ```ts
  type Category = 'Pop' | 'Science' | 'Sports' | 'Rock';
  interface Player { readonly name: string; place: number; purse: number; inPenaltyBox: boolean; }
  private readonly players: Player[] = [];
  private readonly questions: Record<Category, string[]> = { Pop: [], Science: [], Sports: [], Rock: [] };
  ```

### 11. Duplicated move, correct-answer and next-player code — Medium
- **Location:** `app/src/game.ts:54-61` vs `68-75`; `130-140` vs `151-163`; next-player code at `121-123`, `136-138`, `142-144`, `159-161`
- **Guideline:** `CC ch.17 G5` (DRY).
- **Problem:** The move/print/ask block is written twice, the award-coin block is written twice, and the "next player" code is written four times. The copies have already drifted apart: one message says "correct", the other "corrent" (line 130 vs 151). A fix applied to only one copy is a likely future bug.
- **Recommendation:** Extract `movePlayer(roll)`, `awardCoin()` and `nextPlayer()`, and call them from both branches.

### 12. Game rules mixed with console output; no way to inject output — Medium
- **Location:** `app/src/game.ts` (every `console.log`, e.g. 35, 36, 46, 47, 53, 59, 117, 118, 130, 151)
- **Guideline:** `CC` SRP and `ch.10` (Classes); `CC ch.9` (testability).
- **Problem:** `Game` holds the rules, the question bank and the presentation all at once. The only way to watch its behaviour is to replace the global `console.log`, which is what the test does (`tests/game-runner.test.ts:18`). (Judgement call.)
- **Recommendation:** Inject an output port, e.g. `constructor(private readonly log: (msg: string) => void = console.log)`, or have the game emit events. Then tests can assert on state and messages without patching globals. `GameRunner.runProgram` already injects `random`, which is a good pattern to copy.

### 13. Long methods and `if` chains that break Open/Closed — Medium
- **Location:** `app/src/game.ts:45-77` (`roll`, 33 lines, 3 levels of nesting), `79-110` (`askQuestion`, `currentCategory`), `127-165` (`wasCorrectlyAnswered`, 39 lines)
- **Guideline:** `CC ch.3` (small functions, one level of abstraction); `CC` OCP / `ch.17 G23`.
- **Problem:** Adding a category means editing `currentCategory`, `askQuestion` and the constructor. `currentCategory` is a chain of 10 `if`s that could be `CATEGORIES[place % 4]`. `askQuestion` calls `currentCategory()` four times, and `createRockQuestion` is only used for one of the four categories. (Judgement call.)
- **Recommendation:** `const CATEGORIES: Category[] = ['Pop', 'Science', 'Sports', 'Rock'];`, then `currentCategory = () => CATEGORIES[place % CATEGORIES.length]` and `askQuestion = () => log(nextQuestion(this.questions[category]))`. Split `roll` into a penalty-box branch and a normal-move branch that share `movePlayer`.

### 14. Style: `==`/`!=`, `var`, string concatenation, `Array<T>`, redundant annotations, missing return types, typo — Low
- **Location:** `app/src/game.ts` lines 50, 80-109, 113, 122, 135, 137, 143, 157, 160; 3-13; 7-8; 45; 151. `app/src/game-runner.ts` 8, 14, 19
- **Guideline:** `GTS` (`===` only; no `var`; template literals; `T[]` for simple types; explicit return types on public API); `ETS #19` (don't annotate obvious inferred types).
- **Problem (grouped):**
  - `==`/`!=` used everywhere. `var winner` is declared twice in the same function (135, 157).
  - String concatenation instead of template literals.
  - `Array<string>` instead of `string[]` for simple element types.
  - `private currentPlayer: number = 0` and `boolean = false` repeat what is inferred.
  - `roll()` and `runProgram()` have no return types.
  - `let notAWinner;` has an implicit `any` type.
  - Indentation mixes 2 and 4 spaces with trailing whitespace.
  - `this` inside `static` methods (`game-runner.ts:5`) works, but `GameRunner.runProgram()` is clearer.
  - User-facing typo "Answer was corrent!!!!" (line 151).
- **Recommendation:** Fix these in bulk with a linter or formatter (#7) instead of by hand.

### 15. Commented-out test, unused dependency, test writes into the working directory — Low
- **Location:** `app/tests/game-runner.test.ts:28-30`, `33-35`; `app/package.json:39`
- **Guideline:** `CC ch.4` (no commented-out code); `CC ch.17 G9` (dead code); `CC ch.9` (Independent/Repeatable).
- **Problem:** The golden-master generator is a commented-out test. `sinon` is a devDependency that nothing uses. The test writes `test-run.txt` relative to the current working directory, so it only works when run from `app/` and leaves a file behind that isn't git-ignored.
- **Recommendation:** Move master generation to an npm script (e.g. `npm run golden-master`). Remove `sinon`. Build file paths with `path.join(__dirname, …)` and write to a temp dir, or compare in memory without writing a file.

## Positive notes
- `GameRunner.runProgram(random = Math.random)` already injects the source of randomness, which is what made the deterministic seeded test possible. Keep it and use the same approach for output (#12).
- Fields in `Game` are `private`, and the public API is small (`add`, `roll`, `wasCorrectlyAnswered`, `wrongAnswer`). That gives a clear seam for refactoring.
- The code uses named ES module exports (`export class Game`) with no default exports or namespaces, as the Google style guide recommends.
- A golden-master safety net exists before any refactoring, which is the right first step for legacy code. It just shouldn't be the only test (#5).

## Suggested next steps
1. **Fix the toolchain (#7):** upgrade TypeScript and ts-node, add `tsconfig.json` with `strict` and `noUncheckedIndexedAccess`, add ESLint. Do this first so the compiler helps with the rest.
2. **Remove the import-time side effect (#6)** so tests are deterministic.
3. **Add focused unit tests for `Game`** that currently *fail* for #1–#4 and #9: first player moves from 0 and can win; one or zero players is rejected; leaving the penalty box; deck exhaustion; wrap-around 11 → 0; invalid rolls are rejected.
4. **Fix the correctness bugs (#1, #2, #3, #4, #9)** until those tests pass. Generate a new golden master on purpose and review the diff.
5. **Refactor under test (#8, #10, #11, #12, #13):** one player object, a `Category` union with a lookup table, extracted helpers, an injected logger, clear `hasPlayerWon`/`isOver` queries.
6. **Clean up (#14, #15)** with the linter and formatter.
