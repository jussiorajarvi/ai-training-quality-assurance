import {DIE_FACES, Game, Logger} from './game';

/** One in ten answers is wrong: an answer is wrong when the 0-9 draw equals this value. */
const WRONG_ANSWER_DRAW = 7;
const ANSWER_DRAW_RANGE = 10;
export const DEFAULT_MAX_TURNS = 10_000;

export interface RunOptions {
    readonly random?: () => number;
    readonly log?: Logger;
    readonly players?: readonly string[];
    readonly maxTurns?: number;
}

export class GameRunner {
    public static main(): void {
        GameRunner.runProgram();
    }

    /** Plays a full game and returns the winner's name. */
    public static runProgram({
        random = Math.random,
        log = console.log,
        players = ['Chet', 'Pat', 'Sue'],
        maxTurns = DEFAULT_MAX_TURNS,
    }: RunOptions = {}): string {
        const game = new Game(log);
        players.forEach(name => game.add(name));

        for (let turn = 0; turn < maxTurns; turn++) {
            game.roll(Math.floor(random() * DIE_FACES) + 1);

            if (game.isQuestionPending()) {
                if (Math.floor(random() * ANSWER_DRAW_RANGE) === WRONG_ANSWER_DRAW) {
                    game.wrongAnswer();
                } else {
                    game.correctAnswer();
                }
            }

            if (game.winner !== undefined) {
                return game.winner;
            }
        }
        throw new Error(`No winner after ${maxTurns} turns`);
    }
}
