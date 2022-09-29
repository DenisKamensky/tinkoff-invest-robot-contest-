import {readFile, writeFile} from 'fs';
import {resolve} from 'path';
import {promisify} from 'util';
import IOrder from './entities/order';
import IPair from "./entities/pair";
import { IUserId } from "./entities/user";
const DB_FILE_PATH = 'orders.json';
const loadFile = promisify(readFile);
const saveFile = promisify(writeFile);
declare var logger;

class DataBase {
    private async loadFile () {
        try {
            const file = await loadFile(resolve(DB_FILE_PATH), 'utf-8');
            const data = JSON.parse(file);
            return data;
        } catch {
            return {
                orders: [],
                lastOrderTime: Date.now(),
            }
        }
        
    }
    private async saveFile(data) {
        await saveFile(resolve(DB_FILE_PATH), JSON.stringify(data, null, 2));
    }

    async getLastOrderTime(pair: IPair, userId: IUserId) {
        try{
            const {lastOrderTime} = await this.loadFile();
            return lastOrderTime;
        } catch(err) {
            logger.log({
                level: 'error',
                error: err
            })
            return Date.now();
        }
    }
    async getOrders(pair: IPair, userId: IUserId) {
        try {
            const {orders} = await this.loadFile();
            return orders;
        }
        catch (err) {
            logger.log({
                level: 'error',
                error: err
            })
            return [];
        }
    }

    async saveOrder(pair: IPair, userId: IUserId, order: IOrder) {
        const data = await this.loadFile();
        data.orders.push(order);
        data.orders.sort((a, b) => Number(b.price) - Number(a.price));
        data.lastOrderTime = Date.now();
        await this.saveFile(data);
    }

    async deleteOrder(id: string) {
        const data = await this.loadFile();
        data.orders = data.orders.filter(order => String(order.orderId) !== id);
        data.lastOrderTime = Date.now();
        await this.saveFile(data);
    }
}


const db = new DataBase();

export default db;