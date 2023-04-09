
import IOrder from '../entities/order';
import IPair from "../entities/pair";
import IPortfolio, { IRawPortfolio } from '../entities/portfolio';
import {IUserId} from "../entities/user";
import OrderRepository from '../repositories/orderRepository/mongoDbRepository';
import PortfolioRepository from '../repositories/portfolioRepository/mongoDbRepository';
import OrderService from '../services/orderService';
import PortfolioService from '../services/portfolioService';

class DataBase {
    private readonly _orderService: OrderService;
    private readonly _portfolioService: PortfolioService;
    constructor(orderService: OrderService, portfolioService: PortfolioService) {
        this._orderService = orderService;
        this._portfolioService = portfolioService;
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

    getPortfolio(id: IPortfolio['id']) {
        return this._portfolioService.getPortfolio(id);
    }

    savePortfolio(id: IPortfolio['id'], portfolio: IRawPortfolio) {
        this._portfolioService.savePortfolio(id, portfolio);
    }
}

const orderRepository = new OrderRepository();
const portfolioRepository = new PortfolioRepository();
//@ts-ignore
const orderService = new OrderService(orderRepository);
//@ts-ignore
const portfolioService = new PortfolioService(portfolioRepository);
const db = new DataBase(orderService, portfolioService);

export default db;
