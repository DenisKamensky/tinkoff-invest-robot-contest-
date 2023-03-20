
import connectToDbPromise, {getdbStatus} from '../../db/mongodb';
import mongoose, {ConnectionStates} from 'mongoose';
import IOrder from '../../entities/order';
import {IUserId} from "../../entities/user";
import {IOrderRepositrory} from './';
import OrderModel from '../../db/mongodb/models/order';
import LastTadeModel from '../../db/mongodb/models/lastOrderTime';

const mapOrder = mongoOrder => {
    mongoOrder.id = mongoOrder._id.toString();
    return mongoOrder;
}

class MongoDbRepository implements IOrderRepositrory {
    private readonly _orderModel = OrderModel;
    private readonly _lastTradeModel = LastTadeModel;

    private connectToDb() {
        return  getdbStatus() === ConnectionStates.connected
            ? Promise.resolve()
            : connectToDbPromise;
    }
    async updateLastTrade(pair: string, userId: string, time: number){
        await this.connectToDb();
        const lastTrade = await this._lastTradeModel.findOne({pair, userId});
        if (!lastTrade) {
            return this._lastTradeModel.create({pair, userId, time})
        } else {
            lastTrade.time = time;
            return lastTrade.save();
        }
    };

    async getLastOrderTime(pair: string, userId: IUserId) {
        await this.connectToDb();
        const lastTrade = await this._lastTradeModel.findOne({pair, userId});
        return lastTrade ? Number(lastTrade.time) : null;
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
