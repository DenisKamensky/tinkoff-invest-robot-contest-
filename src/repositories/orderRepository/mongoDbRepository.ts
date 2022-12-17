
import connectToDbPromise, {STATUS as DB_STATUS, getdbStatus} from '../../db/mongodb';
import IOrder from '../../entities/order';
import {IUserId} from "../../entities/user";
import {IOrderRepositrory} from './';

const mapOrder = mongoOrder => {
    mongoOrder.id = mongoOrder._id.toString();
    return mongoOrder;
}



class MongoDbRepository implements IOrderRepositrory {
    private readonly _orderModel: any;
    private readonly _lastTradeModel: any; 
    constructor(orderModel, lastTradeModel) {
        this._orderModel = orderModel;
        this._lastTradeModel = lastTradeModel;
    }

    private connectToDb() {
        return  getdbStatus() === DB_STATUS.connected
            ? Promise.resolve()
            : connectToDbPromise;
    }
    async updateLastTrade(pair: string, userId: string, time: number){
        await this.connectToDb();
        const lastTrade = await this._lastTradeModel.findOne({pair, userId});
        lastTrade
            ? this._lastTradeModel.findByIdAndUpdate(lastTrade._id.toString(), {$set: {time}})
            : this._lastTradeModel.create({pair, userId, time})
    };

    async getLastOrderTime(pair: string, userId: IUserId) {
        await this.connectToDb();
        const lastTrade = await this._lastTradeModel.findOne({pair, userId});
        return Number(lastTrade.time);
    }

    async getOrders(pair: string, userId: IUserId) {
        await this.connectToDb();
        const orders = await this._orderModel.find({pair, userId}).sort({price: -1});
        return orders.map(mapOrder);
    }

    async saveOrder(pair: string, userId: string, order: IOrder) {
        await this.connectToDb();
        order._id = order.id;
        order.userId = userId;
        order.pair = pair;
        order.quantity = Number(order.quantity || order.origQty);
        delete order.id;
        return this._orderModel.create(order).then(() => undefined);
    }

    // @ts-ignore
    async deleteOrder(id: IOrder['id']){
        await this.connectToDb();
        const deletedOrder = await this._orderModel.findByIdAndRemove(id);
        return {
            pair: deletedOrder.pair,
            time: Number(deletedOrder.time),
            userId: deletedOrder.userId,
        }
    }
}

export default MongoDbRepository;
