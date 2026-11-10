import {expect} from 'chai';
import {BOARD_SIZE, CATEGORIES, categoryAt} from '../src/game';

describe('board categories', () => {
    it('maps every square to Pop, Science, Sports, Rock in turn', () => {
        const categories = Array.from({length: BOARD_SIZE}, (_, place) => categoryAt(place));
        expect(categories).to.deep.equal([
            'Pop', 'Science', 'Sports', 'Rock',
            'Pop', 'Science', 'Sports', 'Rock',
            'Pop', 'Science', 'Sports', 'Rock',
        ]);
    });

    it('has four distinct categories', () => {
        expect(new Set(CATEGORIES).size).to.equal(4);
    });

    it('has the same number of squares for every category', () => {
        expect(BOARD_SIZE % CATEGORIES.length).to.equal(0);
        for (const category of CATEGORIES) {
            const squares = Array.from({length: BOARD_SIZE}, (_, place) => categoryAt(place))
                .filter(c => c === category);
            expect(squares, category).to.have.length(BOARD_SIZE / CATEGORIES.length);
        }
    });

    it('repeats the same category every four squares', () => {
        for (let place = 0; place + CATEGORIES.length < BOARD_SIZE; place++) {
            expect(categoryAt(place + CATEGORIES.length), `square ${place}`).to.equal(categoryAt(place));
        }
    });

    it('rejects a negative square', () => {
        expect(() => categoryAt(-1)).to.throw(/Invalid board place: -1/);
    });
});
