import {readFile, writeFile} from 'fs';
import {resolve} from 'path';
import {promisify} from 'util';

const DB_FILE_PATH = 'orders.json';
const loadFile = promisify(readFile);
const saveFile = promisify(writeFile);


export class LocalFileDataBase {
    async loadFile() {
        const file = await loadFile(resolve(DB_FILE_PATH), 'utf-8');
        const data = JSON.parse(file);
        return data;
    }
    
    async saveFile(data) {
        await saveFile(resolve(DB_FILE_PATH), JSON.stringify(data, null, 2));
    }
}

const localDb = new LocalFileDataBase();

export default localDb;
