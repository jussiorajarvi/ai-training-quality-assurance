import {DIE_FACES} from '../../src/game';

/** Random value that makes the runner roll `roll` (1-6). */
export function rollOf(roll: number): number {
    return (roll - 0.5) / DIE_FACES;
}

/** Random value that makes the runner draw `draw` (0-9); 7 means a wrong answer. */
export function drawOf(draw: number): number {
    return (draw + 0.5) / 10;
}

export const CORRECT = drawOf(0);
export const WRONG = drawOf(7);

export interface ScriptedRandom {
    readonly next: () => number;
    readonly remaining: () => number;
}

/** Returns the given values in order and fails the test if more are requested. */
export function scriptedRandom(values: readonly number[]): ScriptedRandom {
    let index = 0;
    return {
        next: () => {
            const value = values[index];
            if (value === undefined) {
                throw new Error(`Scripted random exhausted after ${values.length} values`);
            }
            index++;
            return value;
        },
        remaining: () => values.length - index,
    };
}
