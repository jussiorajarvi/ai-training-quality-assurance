import {expect} from 'chai';
import {CATEGORIES, QUESTIONS_PER_CATEGORY, QuestionDeck} from '../src/game';

function drawMany(deck: QuestionDeck, count: number): string[] {
    return Array.from({length: count}, () => deck.draw());
}

describe('QuestionDeck', () => {
    for (const category of CATEGORIES) {
        it(`labels ${category} questions with the category and a zero-based index`, () => {
            const deck = new QuestionDeck(category, 3);
            expect(drawMany(deck, 3)).to.deep.equal([
                `${category} Question 0`, `${category} Question 1`, `${category} Question 2`,
            ]);
        });
    }

    it('starts again from the first question after the last one, repeatedly', () => {
        const deck = new QuestionDeck('Pop', 2);
        expect(drawMany(deck, 6)).to.deep.equal([
            'Pop Question 0', 'Pop Question 1',
            'Pop Question 0', 'Pop Question 1',
            'Pop Question 0', 'Pop Question 1',
        ]);
    });

    it(`holds ${QUESTIONS_PER_CATEGORY} distinct questions in a full-size deck (regression: printed undefined when exhausted)`, () => {
        const deck = new QuestionDeck('Rock', QUESTIONS_PER_CATEGORY);
        const firstRound = drawMany(deck, QUESTIONS_PER_CATEGORY);
        expect(new Set(firstRound).size).to.equal(QUESTIONS_PER_CATEGORY);
        expect(firstRound[QUESTIONS_PER_CATEGORY - 1]).to.equal('Rock Question 49');
        expect(deck.draw()).to.equal('Rock Question 0');
    });

    it('returns the same question every time when it holds only one', () => {
        const deck = new QuestionDeck('Science', 1);
        expect(drawMany(deck, 3)).to.deep.equal(['Science Question 0', 'Science Question 0', 'Science Question 0']);
    });

    it('rejects drawing from an empty deck', () => {
        expect(() => new QuestionDeck('Sports', 0).draw()).to.throw(/Question deck is empty/);
    });

    it('keeps the position of each deck separate', () => {
        const pop = new QuestionDeck('Pop', 5);
        const rock = new QuestionDeck('Rock', 5);
        pop.draw();
        pop.draw();
        expect(rock.draw()).to.equal('Rock Question 0');
        expect(pop.draw()).to.equal('Pop Question 2');
    });
});
