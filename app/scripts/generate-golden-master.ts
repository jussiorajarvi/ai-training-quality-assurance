import * as fs from 'node:fs';
import * as path from 'node:path';
import {GOLDEN_MASTER_PATH, recordGames} from '../tests/support/golden-master';

fs.mkdirSync(path.dirname(GOLDEN_MASTER_PATH), {recursive: true});
fs.writeFileSync(GOLDEN_MASTER_PATH, recordGames());
console.log(`Golden master written to ${GOLDEN_MASTER_PATH}`);
