import {expect} from 'chai';
import {DIE_FACES, Game, MAX_PLAYERS, MIN_PLAYERS, WINNING_COINS} from '../src/game';

function createGame(...names: string[]): {game: Game; output: string[]} {
    const output: string[] = [];
    const game = new Game(line => output.push(line));
    names.forEach(name => game.add(name));
    output.length = 0;
    return {game, output};
}

function correctTurn(game: Game, roll: number): void {
    game.roll(roll);
    game.correctAnswer();
}

function wrongTurn(game: Game, roll: number): void {
    game.roll(roll);
    game.wrongAnswer();
}

/** Returns the lines of the next call only. */
function linesOf(output: string[], action: () => void): string[] {
    output.length = 0;
    action();
    return [...output];
}

describe('Game', () => {
    describe('logging', () => {
        it('writes to console.log when no logger is given', () => {
            const original = console.log;
            const captured: string[] = [];
            console.log = (message: string) => { captured.push(message); };
            try {
                new Game().add('Chet');
            } finally {
                console.log = original;
            }
            expect(captured).to.deep.equal(['Chet was added', 'They are player number 1']);
        });

        it('writes only to the given logger', () => {
            const original = console.log;
            let consoleCalls = 0;
            console.log = () => { consoleCalls++; };
            try {
                const {game} = createGame('A', 'B');
                correctTurn(game, 1);
            } finally {
                console.log = original;
            }
            expect(consoleCalls).to.equal(0);
        });
    });

    describe('adding players', () => {
        it('announces each player with their number', () => {
            const output: string[] = [];
            const game = new Game(line => output.push(line));
            game.add('Chet');
            game.add('Pat');
            expect(output).to.deep.equal([
                'Chet was added', 'They are player number 1',
                'Pat was added', 'They are player number 2',
            ]);
        });

        it(`accepts exactly ${MAX_PLAYERS} players`, () => {
            const output: string[] = [];
            const game = new Game(line => output.push(line));
            for (let i = 1; i <= MAX_PLAYERS; i++) {
                game.add(`P${i}`);
            }
            expect(output[output.length - 1]).to.equal(`They are player number ${MAX_PLAYERS}`);
        });

        it(`rejects player number ${MAX_PLAYERS + 1}`, () => {
            const {game, output} = createGame('A', 'B', 'C', 'D', 'E', 'F');
            expect(() => game.add('G')).to.throw(/more than 6 players/);
            expect(output).to.deep.equal([]);
        });

        for (const name of ['', '   ']) {
            it(`rejects the blank name ${JSON.stringify(name)}`, () => {
                const {game} = createGame();
                expect(() => game.add(name)).to.throw(/must not be empty/);
            });
        }

        it('rejects new players once the game has started', () => {
            const {game} = createGame('A', 'B');
            game.roll(1);
            expect(() => game.add('C')).to.throw(/after the game has started/);
        });

        it('still accepts players after a rejected roll, because the game has not started', () => {
            const {game} = createGame('A');
            expect(() => game.roll(1)).to.throw(/At least 2 players/);
            game.add('B');
            expect(() => game.roll(1)).to.not.throw();
        });
    });

    describe('rolling', () => {
        it(`needs at least ${MIN_PLAYERS} players`, () => {
            expect(() => createGame().game.roll(1)).to.throw(/At least 2 players/);
            expect(() => createGame('Solo').game.roll(1)).to.throw(/At least 2 players/);
        });

        for (const roll of [0, DIE_FACES + 1, -1, 1.5, NaN, Infinity]) {
            it(`rejects the invalid roll ${roll}`, () => {
                const {game, output} = createGame('A', 'B');
                expect(() => game.roll(roll)).to.throw(/integer from 1 to 6/);
                expect(output).to.deep.equal([]);
            });
        }

        it('keeps the same player after a rejected roll', () => {
            const {game, output} = createGame('A', 'B');
            expect(() => game.roll(7)).to.throw(/integer from 1 to 6/);
            expect(linesOf(output, () => game.roll(1))[0]).to.equal('A is the current player');
        });

        for (let roll = 1; roll <= DIE_FACES; roll++) {
            it(`moves the player ${roll} square(s) forward on a roll of ${roll}`, () => {
                const {game, output} = createGame('A', 'B');
                game.roll(roll);
                expect(output).to.include(`A's new location is ${roll}`);
            });
        }

        it('moves the first player from square 0 (regression: first player stuck at NaN)', () => {
            const {game, output} = createGame('Chet', 'Pat');
            game.roll(3);
            expect(output).to.deep.equal([
                'Chet is the current player',
                'They have rolled a 3',
                "Chet's new location is 3",
                'The category is Rock',
                'Rock Question 0',
            ]);
        });

        it('adds each roll to the previous place', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 2);
            correctTurn(game, 1);
            expect(linesOf(output, () => game.roll(3))).to.include("A's new location is 5");
        });

        it('wraps around from the last square back to square 0', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 5);  // A -> 5
            correctTurn(game, 1);  // B
            correctTurn(game, 6);  // A -> 11
            correctTurn(game, 1);  // B
            const lines = linesOf(output, () => game.roll(1));
            expect(lines).to.include("A's new location is 0");
            expect(lines).to.include('The category is Pop');
        });

        it('wraps around past square 0 when the roll overshoots', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 6);  // A -> 6
            correctTurn(game, 1);  // B
            correctTurn(game, 4);  // A -> 10
            correctTurn(game, 1);  // B
            expect(linesOf(output, () => game.roll(5))).to.include("A's new location is 3");
        });

        it('rejects a second roll before the question is answered', () => {
            const {game} = createGame('A', 'B');
            game.roll(1);
            expect(() => game.roll(1)).to.throw(/must be answered/);
        });

        it('marks a question as pending only between the roll and the answer', () => {
            const {game} = createGame('A', 'B');
            expect(game.isQuestionPending()).to.equal(false);
            game.roll(1);
            expect(game.isQuestionPending()).to.equal(true);
            game.correctAnswer();
            expect(game.isQuestionPending()).to.equal(false);
            game.roll(1);
            game.wrongAnswer();
            expect(game.isQuestionPending()).to.equal(false);
        });
    });

    describe('questions', () => {
        it('asks the question for the category of the new square', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 1);  // A -> Science
            correctTurn(game, 2);  // B -> Sports
            correctTurn(game, 2);  // A -> 3, Rock
            correctTurn(game, 2);  // B -> 4, Pop
            expect(output.filter(line => / Question \d+$/.test(line))).to.deep.equal([
                'Science Question 0', 'Sports Question 0', 'Rock Question 0', 'Pop Question 0',
            ]);
        });

        it('shares one deck per category between all players', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 4);  // A -> 4, Pop
            correctTurn(game, 4);  // B -> 4, Pop
            correctTurn(game, 4);  // A -> 8, Pop
            expect(output.filter(line => line.startsWith('Pop Question'))).to.deep.equal([
                'Pop Question 0', 'Pop Question 1', 'Pop Question 2',
            ]);
        });
    });

    describe('answering', () => {
        it('logs a correct answer and the new coin total', () => {
            const {game, output} = createGame('A', 'B');
            game.roll(1);
            expect(linesOf(output, () => game.correctAnswer())).to.deep.equal([
                'Answer was correct!!!!', 'A now has 1 Gold Coins.',
            ]);
        });

        it('adds up coins over several correct answers', () => {
            const {game, output} = createGame('A', 'B');
            for (let i = 0; i < 3; i++) {
                correctTurn(game, 1);  // A
                correctTurn(game, 1);  // B
            }
            expect(output.filter(line => line.startsWith('A now has'))).to.deep.equal([
                'A now has 1 Gold Coins.', 'A now has 2 Gold Coins.', 'A now has 3 Gold Coins.',
            ]);
        });

        it('keeps a separate coin total for each player', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 1);
            correctTurn(game, 1);
            correctTurn(game, 1);
            expect(output.filter(line => line.includes('Gold Coins'))).to.deep.equal([
                'A now has 1 Gold Coins.', 'B now has 1 Gold Coins.', 'A now has 2 Gold Coins.',
            ]);
        });

        it('logs a wrong answer and sends the player to the penalty box', () => {
            const {game, output} = createGame('A', 'B');
            game.roll(1);
            expect(linesOf(output, () => game.wrongAnswer())).to.deep.equal([
                'Question was incorrectly answered', 'A was sent to the penalty box',
            ]);
        });

        it('does not take coins away for a wrong answer', () => {
            const {game, output} = createGame('A', 'B');
            correctTurn(game, 1);  // A: 1 coin
            correctTurn(game, 1);
            wrongTurn(game, 1);    // A into the box
            correctTurn(game, 1);
            correctTurn(game, 1);  // A released
            expect(output).to.include('A now has 2 Gold Coins.');
        });

        it('passes the turn to the next player after either answer', () => {
            const {game, output} = createGame('A', 'B', 'C');
            correctTurn(game, 1);
            expect(linesOf(output, () => game.roll(1))[0]).to.equal('B is the current player');
            game.wrongAnswer();
            expect(linesOf(output, () => game.roll(1))[0]).to.equal('C is the current player');
        });

        it(`goes round all ${MAX_PLAYERS} players and back to the first`, () => {
            const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
            const {game, output} = createGame(...names);
            for (let i = 0; i < names.length + 1; i++) {
                correctTurn(game, 1);
            }
            const order = output
                .filter(line => line.endsWith(' is the current player'))
                .map(line => line.replace(' is the current player', ''));
            expect(order).to.deep.equal([...names, 'P1']);
        });

        it('rejects an answer when no question was asked', () => {
            const {game} = createGame('A', 'B');
            expect(() => game.correctAnswer()).to.throw(/no question/);
            expect(() => game.wrongAnswer()).to.throw(/no question/);
        });

        it('rejects answering the same question twice', () => {
            const {game} = createGame('A', 'B');
            correctTurn(game, 1);
            expect(() => game.correctAnswer()).to.throw(/no question/);
            expect(() => game.wrongAnswer()).to.throw(/no question/);
        });
    });

    describe('winning', () => {
        it('has no winner at the start', () => {
            const {game} = createGame('A', 'B');
            expect(game.isOver()).to.equal(false);
            expect(game.winner).to.equal(undefined);
        });

        it(`lets the first player win with ${WINNING_COINS} coins (regression: first player could never win)`, () => {
            const {game} = createGame('Chet', 'Pat');
            for (let i = 0; i < WINNING_COINS - 1; i++) {
                correctTurn(game, 1);   // Chet
                wrongTurn(game, 1);     // Pat
            }
            expect(game.isOver()).to.equal(false);

            correctTurn(game, 1);
            expect(game.isOver()).to.equal(true);
            expect(game.winner).to.equal('Chet');
        });

        it('lets a later player win', () => {
            const {game} = createGame('A', 'B', 'C');
            for (let i = 0; i < WINNING_COINS; i++) {
                wrongTurn(game, 1);    // A
                correctTurn(game, 1);  // B
                if (game.isOver()) {
                    break;
                }
                wrongTurn(game, 1);    // C: an odd roll always gets a question, even from the box
            }
            expect(game.winner).to.equal('B');
        });

        it(`does not end the game at ${WINNING_COINS - 1} coins`, () => {
            const {game, output} = createGame('A', 'B');
            for (let i = 0; i < WINNING_COINS - 1; i++) {
                correctTurn(game, 1);
                wrongTurn(game, 1);
            }
            expect(output).to.include(`A now has ${WINNING_COINS - 1} Gold Coins.`);
            expect(game.isOver()).to.equal(false);
        });

        it('logs the winning coin total as the last line', () => {
            const {game, output} = createGame('A', 'B');
            for (let i = 0; i < WINNING_COINS; i++) {
                correctTurn(game, 1);
                if (!game.isOver()) {
                    wrongTurn(game, 1);
                }
            }
            expect(output[output.length - 1]).to.equal(`A now has ${WINNING_COINS} Gold Coins.`);
        });

        it('rejects rolling and answering after the game is over', () => {
            const {game} = createGame('A', 'B');
            for (let i = 0; i < WINNING_COINS; i++) {
                correctTurn(game, 1);
                if (!game.isOver()) {
                    correctTurn(game, 2);
                }
            }
            expect(game.winner).to.equal('A');
            expect(() => game.roll(1)).to.throw(/game is over/);
            expect(() => game.correctAnswer()).to.throw(/no question/);
            expect(game.winner).to.equal('A');
        });
    });

    describe('penalty box', () => {
        function gameWithAInBox(): {game: Game; output: string[]} {
            const {game, output} = createGame('A', 'B');
            wrongTurn(game, 1);    // A -> 1, into the box
            correctTurn(game, 1);  // B
            output.length = 0;
            return {game, output};
        }

        for (const roll of [2, 4, 6]) {
            it(`keeps the player in the box on the even roll ${roll}, asks nothing and passes the turn`, () => {
                const {game, output} = gameWithAInBox();
                expect(linesOf(output, () => game.roll(roll))).to.deep.equal([
                    'A is the current player',
                    `They have rolled a ${roll}`,
                    'A is not getting out of the penalty box',
                ]);
                expect(game.isQuestionPending()).to.equal(false);
                expect(linesOf(output, () => game.roll(1))[0]).to.equal('B is the current player');
            });
        }

        for (const roll of [1, 3, 5]) {
            it(`releases the player on the odd roll ${roll}, moves them and asks a question`, () => {
                const {game, output} = gameWithAInBox();
                const lines = linesOf(output, () => game.roll(roll));
                expect(lines.slice(0, 4)).to.deep.equal([
                    'A is the current player',
                    `They have rolled a ${roll}`,
                    'A is getting out of the penalty box',
                    `A's new location is ${1 + roll}`,
                ]);
                expect(game.isQuestionPending()).to.equal(true);
            });
        }

        it('does not move the player while they stay in the box', () => {
            const {game, output} = gameWithAInBox();
            game.roll(2);          // A stays on square 1
            correctTurn(game, 1);  // B
            expect(linesOf(output, () => game.roll(1))).to.include("A's new location is 2");
        });

        it('lets a released player move on an even roll later (regression: never released)', () => {
            const {game, output} = gameWithAInBox();
            correctTurn(game, 3);  // A released -> 4
            correctTurn(game, 1);  // B
            const lines = linesOf(output, () => game.roll(2));
            expect(lines).to.not.include('A is not getting out of the penalty box');
            expect(lines).to.include("A's new location is 6");
        });

        it('lets a released player earn coins', () => {
            const {game, output} = gameWithAInBox();
            game.roll(3);
            expect(linesOf(output, () => game.correctAnswer())).to.include('A now has 1 Gold Coins.');
        });

        it('sends a released player back to the box after another wrong answer', () => {
            const {game, output} = gameWithAInBox();
            wrongTurn(game, 3);    // A released, then wrong again
            correctTurn(game, 1);  // B
            expect(linesOf(output, () => game.roll(2))).to.include('A is not getting out of the penalty box');
        });

        it('tracks the box separately for each player', () => {
            const {game, output} = createGame('A', 'B', 'C');
            wrongTurn(game, 1);    // A into the box
            wrongTurn(game, 1);    // B into the box
            correctTurn(game, 1);  // C
            expect(linesOf(output, () => game.roll(2))).to.include('A is not getting out of the penalty box');
            expect(linesOf(output, () => game.roll(3))).to.include('B is getting out of the penalty box');
            game.correctAnswer();
            const cLines = linesOf(output, () => game.roll(2));
            expect(cLines).to.not.include('C is not getting out of the penalty box');
            expect(cLines).to.include("C's new location is 3");
        });

        it('can let a player in the box win after being released', () => {
            const {game} = createGame('A', 'B');
            wrongTurn(game, 1);        // A into the box
            wrongTurn(game, 1);        // B into the box
            for (let i = 0; i < WINNING_COINS; i++) {
                correctTurn(game, 1);  // A: odd roll, released and correct
                if (!game.isOver()) {
                    game.roll(2);      // B stays in the box
                }
            }
            expect(game.winner).to.equal('A');
        });
    });
});
