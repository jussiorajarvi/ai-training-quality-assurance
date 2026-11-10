import * as path from 'node:path';
import {GameRunner} from '../../src/game-runner';

export const GOLDEN_MASTER_PATH = path.join(__dirname, '..', 'fixtures', 'golden-master.txt');
const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Deterministic linear congruential generator returning values in [0, 1). */
export function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}

/** Plays one game per seed and returns the combined console output. */
export function recordGames(): string {
    const lines: string[] = [];
    for (const seed of SEEDS) {
        GameRunner.runProgram({random: seededRandom(seed), log: line => lines.push(line)});
    }
    return lines.join('\n') + '\n';
}
