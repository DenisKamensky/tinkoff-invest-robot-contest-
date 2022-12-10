import {LocalFileDataBase} from '../../db/localFile';
import IOrder from '../../entities/order';
import {IUserId} from "../../entities/user";
import {IOrderRepositrory} from './';

class OrderRepositoryLocal implements IOrderRepositrory {
    private readonly _db: LocalFileDataBase;
    constructor(db: LocalFileDataBase) {
        this._db = db;
    }

    async getLastOrderTime(pair: string, userId: IUserId) {
        const {lastOrderTime} = await this._db.loadFile();
        return lastOrderTime;
    }

    async updateLastTrade(pair: string, userId: string, time: number) {
        const data = await this._db.loadFile();
        data.lastOrderTime = time;
        this._db.saveFile(data);
    }

    async getOrders(pair: string, userId: IUserId) {
        const {orders} = await this._db.loadFile();
        return orders;
    }

    async saveOrder(pair: string, userId: string, order: IOrder) {
        const data = await this._db.loadFile();
        data.orders.push(order);
        data.orders.sort((a, b) => Number(b.price) - Number(a.price));
        await this._db.saveFile(data);
        return;
    }

    // @ts-ignore
    async deleteOrder(id: IOrder['id']){
        const data = await this._db.loadFile();
        data.orders = data.orders.filter(order => {
            const orderId = order.id || order.orderId;
            return orderId !== id;
        });
        await this._db.saveFile(data);
        return {
            time: Date.now(),
        };
    }
}

export default OrderRepositoryLocal;
