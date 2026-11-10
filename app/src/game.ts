export type Category = 'Pop' | 'Science' | 'Sports' | 'Rock';
export type Logger = (message: string) => void;

/** Board squares cycle through the categories in this order: 0 Pop, 1 Science, 2 Sports, 3 Rock, 4 Pop, ... */
export const CATEGORIES: readonly Category[] = ['Pop', 'Science', 'Sports', 'Rock'];
export const BOARD_SIZE = 12;
export const DIE_FACES = 6;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const WINNING_COINS = 6;
export const QUESTIONS_PER_CATEGORY = 50;

interface Player {
    readonly name: string;
    place: number;
    coins: number;
    inPenaltyBox: boolean;
}

/** A fixed set of questions that is reused from the start once every question has been asked. */
export class QuestionDeck {
    private readonly questions: readonly string[];
    private nextIndex = 0;

    constructor(category: Category, size: number) {
        this.questions = Array.from({length: size}, (_, i) => `${category} Question ${i}`);
    }

    draw(): string {
        const question = this.questions[this.nextIndex % this.questions.length];
        if (question === undefined) {
            throw new Error('Question deck is empty');
        }
        this.nextIndex++;
        return question;
    }
}

export class Game {
    private readonly players: Player[] = [];
    private readonly decks: Record<Category, QuestionDeck>;
    private currentIndex = 0;
    private started = false;
    private questionPending = false;
    private winnerName: string | undefined;

    constructor(private readonly log: Logger = console.log) {
        this.decks = {
            Pop: new QuestionDeck('Pop', QUESTIONS_PER_CATEGORY),
            Science: new QuestionDeck('Science', QUESTIONS_PER_CATEGORY),
            Sports: new QuestionDeck('Sports', QUESTIONS_PER_CATEGORY),
            Rock: new QuestionDeck('Rock', QUESTIONS_PER_CATEGORY),
        };
    }

    public add(name: string): void {
        if (this.started) {
            throw new Error('Cannot add players after the game has started');
        }
        if (this.players.length >= MAX_PLAYERS) {
            throw new Error(`A game cannot have more than ${MAX_PLAYERS} players`);
        }
        if (name.trim() === '') {
            throw new Error('Player name must not be empty');
        }

        this.players.push({name, place: 0, coins: 0, inPenaltyBox: false});
        this.log(`${name} was added`);
        this.log(`They are player number ${this.players.length}`);
    }

    /**
     * Plays the die roll for the current player. When this asks a question,
     * the caller must answer it with {@link correctAnswer} or {@link wrongAnswer}.
     * When the player stays in the penalty box, the turn passes to the next player.
     */
    public roll(roll: number): void {
        this.assertCanRoll(roll);
        this.started = true;

        const player = this.currentPlayer();
        this.log(`${player.name} is the current player`);
        this.log(`They have rolled a ${roll}`);

        if (player.inPenaltyBox) {
            if (roll % 2 === 0) {
                this.log(`${player.name} is not getting out of the penalty box`);
                this.nextPlayer();
                return;
            }
            player.inPenaltyBox = false;
            this.log(`${player.name} is getting out of the penalty box`);
        }

        this.move(player, roll);
        this.askQuestion(player);
    }

    public correctAnswer(): void {
        const player = this.answeringPlayer();
        player.coins++;
        this.log('Answer was correct!!!!');
        this.log(`${player.name} now has ${player.coins} Gold Coins.`);

        if (player.coins >= WINNING_COINS) {
            this.winnerName = player.name;
        }
        this.nextPlayer();
    }

    public wrongAnswer(): void {
        const player = this.answeringPlayer();
        player.inPenaltyBox = true;
        this.log('Question was incorrectly answered');
        this.log(`${player.name} was sent to the penalty box`);
        this.nextPlayer();
    }

    public isQuestionPending(): boolean {
        return this.questionPending;
    }

    public isOver(): boolean {
        return this.winnerName !== undefined;
    }

    public get winner(): string | undefined {
        return this.winnerName;
    }

    private assertCanRoll(roll: number): void {
        if (this.isOver()) {
            throw new Error('The game is over');
        }
        if (this.players.length < MIN_PLAYERS) {
            throw new Error(`At least ${MIN_PLAYERS} players are needed to play`);
        }
        if (this.questionPending) {
            throw new Error('The current question must be answered before rolling again');
        }
        if (!Number.isInteger(roll) || roll < 1 || roll > DIE_FACES) {
            throw new Error(`Roll must be an integer from 1 to ${DIE_FACES}, got ${roll}`);
        }
    }

    private answeringPlayer(): Player {
        if (!this.questionPending) {
            throw new Error('There is no question to answer');
        }
        this.questionPending = false;
        return this.currentPlayer();
    }

    private move(player: Player, roll: number): void {
        player.place = (player.place + roll) % BOARD_SIZE;
        this.log(`${player.name}'s new location is ${player.place}`);
    }

    private askQuestion(player: Player): void {
        const category = categoryAt(player.place);
        this.log(`The category is ${category}`);
        this.log(this.decks[category].draw());
        this.questionPending = true;
    }

    private currentPlayer(): Player {
        const player = this.players[this.currentIndex];
        if (player === undefined) {
            throw new Error(`No player at index ${this.currentIndex}`);
        }
        return player;
    }

    private nextPlayer(): void {
        this.currentIndex = (this.currentIndex + 1) % this.players.length;
    }
}

export function categoryAt(place: number): Category {
    const category = CATEGORIES[place % CATEGORIES.length];
    if (category === undefined) {
        throw new Error(`Invalid board place: ${place}`);
    }
    return category;
}
