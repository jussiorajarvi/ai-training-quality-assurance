import {expect} from 'chai';
import {describe, it} from 'mocha';
import {GameRunner} from '../src/game-runner';
import * as fs from 'fs';

let seed = 6;
function seededRandom(min = 0, max = 1): number  {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    return min + rnd * (max - min);
}

function outputRunToFile(fileName: string) {
    const oldLog = console.log;
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }
    console.log = function(str: string) {
        fs.appendFileSync(fileName, str + '\n');
    };
    for (let i=0; i < 10; i++) {
        seed = i;
        GameRunner.runProgram(seededRandom);
    }
    console.log = oldLog;
}

// it('should generate the golden master', function()  {
// 	outputRunToFile('master.txt');
// });

it("master output and new output match", function() {
    outputRunToFile('test-run.txt');
    const master = fs.readFileSync('master.txt', 'utf8');
    const output = fs.readFileSync('test-run.txt' ,'utf8');
    expect(master).to.be.equal(output);
});
