import {expect} from 'chai';
import * as fs from 'node:fs';
import {DEFAULT_MAX_TURNS, GameRunner} from '../src/game-runner';
import {WINNING_COINS} from '../src/game';
import {GOLDEN_MASTER_PATH, recordGames, seededRandom} from './support/golden-master';
import {CORRECT, rollOf, scriptedRandom, WRONG} from './support/scripted-random';

const silent = (): void => undefined;

function play(random: () => number, players?: readonly string[], maxTurns?: number): {winner: string; output: string[]} {
    const output: string[] = [];
    const winner = GameRunner.runProgram({random, log: line => output.push(line), players, maxTurns});
    return {winner, output};
}

/** A answers every question correctly, B every question wrongly; A wins on turn 11. */
function aAlwaysRightBAlwaysWrong(): number[] {
    const values: number[] = [];
    for (let i = 0; i < WINNING_COINS; i++) {
        values.push(rollOf(1), CORRECT);           // A
        if (i < WINNING_COINS - 1) {
            values.push(rollOf(1), WRONG);         // B: odd roll, so a question is always asked
        }
    }
    return values;
}

describe('GameRunner', () => {
    describe('with scripted rolls and answers', () => {
        it('answers wrongly when the answer draw is 7 and correctly otherwise', () => {
            const random = scriptedRandom(aAlwaysRightBAlwaysWrong());
            const {winner, output} = play(random.next, ['A', 'B']);

            expect(winner).to.equal('A');
            expect(output.filter(line => line === 'A was sent to the penalty box')).to.have.length(0);
            expect(output.filter(line => line === 'B was sent to the penalty box')).to.have.length(WINNING_COINS - 1);
            expect(random.remaining()).to.equal(0);
        });

        it('stops as soon as there is a winner', () => {
            const {output} = play(scriptedRandom(aAlwaysRightBAlwaysWrong()).next, ['A', 'B']);
            expect(output[output.length - 1]).to.equal(`A now has ${WINNING_COINS} Gold Coins.`);
        });

        it('draws no answer when the player stays in the penalty box', () => {
            const values = [rollOf(1), WRONG, rollOf(1), CORRECT];  // A into the box, B correct
            for (let i = 0; i < WINNING_COINS - 1; i++) {
                values.push(rollOf(2));                              // A stays: no answer drawn
                values.push(rollOf(1), CORRECT);                     // B
            }
            const random = scriptedRandom(values);
            const {winner, output} = play(random.next, ['A', 'B']);

            expect(winner).to.equal('B');
            expect(output.filter(line => line === 'A is not getting out of the penalty box')).to.have.length(WINNING_COINS - 1);
            expect(output.filter(line => line === 'Question was incorrectly answered')).to.have.length(1);
            expect(random.remaining()).to.equal(0);
        });

        it('turns the lowest random value into a 1 and the highest into a 6', () => {
            const output: string[] = [];
            const random = scriptedRandom([0, CORRECT, 0.9999999, CORRECT]);
            expect(() => GameRunner.runProgram({random: random.next, log: l => output.push(l), players: ['A', 'B'], maxTurns: 2}))
                .to.throw(/No winner after 2 turns/);
            expect(output).to.include('They have rolled a 1');
            expect(output).to.include('They have rolled a 6');
        });

        it('rejects a random source that returns 1, because that would roll a 7', () => {
            expect(() => play(() => 1, ['A', 'B'])).to.throw(/integer from 1 to 6, got 7/);
        });
    });

    describe('turn limit', () => {
        it('finishes a game that needs exactly maxTurns turns', () => {
            const {winner} = play(scriptedRandom(aAlwaysRightBAlwaysWrong()).next, ['A', 'B'], 11);
            expect(winner).to.equal('A');
        });

        it('throws when the game needs one turn more than maxTurns', () => {
            expect(() => play(scriptedRandom(aAlwaysRightBAlwaysWrong()).next, ['A', 'B'], 10))
                .to.throw(/No winner after 10 turns/);
        });

        it('stops with an error instead of looping forever when nobody can win', () => {
            // 0.75 always rolls a 5 and always draws the wrong-answer value 7.
            expect(() => play(() => 0.75, ['A', 'B'], 100)).to.throw(/No winner after 100 turns/);
        });

        it(`uses ${DEFAULT_MAX_TURNS} turns by default`, () => {
            expect(() => GameRunner.runProgram({random: () => 0.75, log: silent}))
                .to.throw(`No winner after ${DEFAULT_MAX_TURNS} turns`);
        });
    });

    describe('players', () => {
        it('plays with Chet, Pat and Sue by default', () => {
            const {output} = play(seededRandom(1));
            expect(output.slice(0, 6)).to.deep.equal([
                'Chet was added', 'They are player number 1',
                'Pat was added', 'They are player number 2',
                'Sue was added', 'They are player number 3',
            ]);
        });

        it('plays with the given players', () => {
            const {winner, output} = play(seededRandom(1), ['Ann', 'Bob']);
            expect(['Ann', 'Bob']).to.include(winner);
            expect(output.slice(0, 4)).to.deep.equal([
                'Ann was added', 'They are player number 1',
                'Bob was added', 'They are player number 2',
            ]);
        });

        it('rejects fewer than two players', () => {
            expect(() => play(seededRandom(1), [])).to.throw(/At least 2 players/);
            expect(() => play(seededRandom(1), ['Solo'])).to.throw(/At least 2 players/);
        });

        it('rejects more than six players', () => {
            expect(() => play(seededRandom(1), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])).to.throw(/more than 6 players/);
        });
    });

    describe('with seeded random games', () => {
        it('plays a seeded game to the end and returns the winner', () => {
            const {winner, output} = play(seededRandom(1));
            expect(['Chet', 'Pat', 'Sue']).to.include(winner);
            expect(output[output.length - 1]).to.equal(`${winner} now has ${WINNING_COINS} Gold Coins.`);
        });

        it('produces the same game for the same seed', () => {
            const first = play(seededRandom(4)).output;
            const second = play(seededRandom(4)).output;
            expect(second).to.deep.equal(first);
        });

        it('produces different games for different seeds', () => {
            expect(play(seededRandom(1)).output).to.not.deep.equal(play(seededRandom(2)).output);
        });

        it('gives every player, including the first, a chance to win', () => {
            const winners = new Set<string>();
            for (let seed = 0; seed < 50; seed++) {
                winners.add(play(seededRandom(seed)).winner);
            }
            expect([...winners].sort()).to.deep.equal(['Chet', 'Pat', 'Sue']);
        });

        it('only ever announces coins to the player whose turn it is', () => {
            const {output} = play(seededRandom(7));
            let current = '';
            for (const line of output) {
                const turn = /^(\w+) is the current player$/.exec(line);
                if (turn?.[1] !== undefined) {
                    current = turn[1];
                }
                const coins = /^(\w+) now has \d+ Gold Coins\.$/.exec(line);
                if (coins) {
                    expect(coins[1]).to.equal(current);
                }
            }
        });

        it('never prints NaN or undefined', () => {
            expect(recordGames()).to.not.match(/NaN|undefined/);
        });

        it('matches the golden master for seeds 0-9', () => {
            const expected = fs.readFileSync(GOLDEN_MASTER_PATH, 'utf8');
            expect(recordGames()).to.equal(expected);
        });
    });

    describe('main', () => {
        it('plays one game with Math.random and console.log', () => {
            const originalLog = console.log;
            const originalRandom = Math.random;
            const output: string[] = [];
            console.log = (message: string) => { output.push(message); };
            Math.random = seededRandom(3);
            try {
                GameRunner.main();
            } finally {
                console.log = originalLog;
                Math.random = originalRandom;
            }
            expect(output[0]).to.equal('Chet was added');
            expect(output[output.length - 1]).to.match(new RegExp(`^(Chet|Pat|Sue) now has ${WINNING_COINS} Gold Coins\\.$`));
        });
    });
});

describe('seededRandom (test support)', () => {
    it('returns values from 0 up to, but not including, 1', () => {
        const random = seededRandom(0);
        for (let i = 0; i < 1000; i++) {
            const value = random();
            expect(value).to.be.at.least(0);
            expect(value).to.be.below(1);
        }
    });

    it('returns the same sequence for the same seed', () => {
        const a = seededRandom(5);
        const b = seededRandom(5);
        expect([a(), a(), a()]).to.deep.equal([b(), b(), b()]);
    });
});
