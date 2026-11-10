import {Game} from './game';

export class GameRunner {
    public static main(): void {
        this.runProgram();
    }

    public static runProgram(random: () => number = Math.random) {
        const game = new Game();
        game.add("Chet");
        game.add("Pat");
        game.add("Sue");

        let notAWinner;
        do {

            game.roll(Math.floor(random() * 6) + 1);

            if (Math.floor(random() * 10) == 7) {
                notAWinner = game.wrongAnswer();
            } else {
                notAWinner = game.wasCorrectlyAnswered();
            }

        } while (notAWinner);
    }
}

GameRunner.main();

