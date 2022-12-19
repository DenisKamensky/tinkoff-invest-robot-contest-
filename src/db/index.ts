
import IOrder from '../entities/order';
import IPair from "../entities/pair";
import {IUserId} from "../entities/user";
import MongoDbRepository from '../repositories/orderRepository/mongoDbRepository';
import OrderService from '../services/orderService';
import LastTadeModel from './mongodb/models/lastOrderTime';
import OrderModel from './mongodb/models/order';


class DataBase {
    private readonly _orderService: OrderService;
    constructor(orderService: OrderService) {
        this._orderService = orderService;
    }

    getLastOrderTime(pair: IPair, userId: IUserId) {
        return this._orderService.getLastOrderTime(pair, userId);
    }

    getOrders(pair: IPair, userId: IUserId) {
        return this._orderService.getOrders(pair, userId);
    }

    saveOrder(pair: IPair, userId: string, order: IOrder) {
        return this._orderService.saveOrder(pair, userId, order);
    }

    deleteOrder(id: IOrder['id']) {
        this._orderService.deleteOrder(id);
    }
}

const orderRepository = new MongoDbRepository();
//@ts-ignore
const orderService = new OrderService(orderRepository);
const db = new DataBase(orderService);

export default db;
