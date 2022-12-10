import IOrder from "../entities/order";
import IPair from "../entities/pair";
import { IUserId } from "../entities/user";
import {IOrderRepositrory} from "../repositories/orderRepository";

declare var logger;

class OrderService {
    private readonly _orderRepository: IOrderRepositrory;
    constructor(orderRepository: IOrderRepositrory) {
        this._orderRepository = orderRepository;
    }
    private transformPair(pair: IPair) {
        return `${pair.make}${pair.take}`;
    }
    getLastOrderTime(pair: IPair, userId: IUserId){
        return this._orderRepository.getLastOrderTime(this.transformPair(pair), userId)
            .catch(err => {
                logger.log({
                    level: 'error',
                    error: err,
                })
                return Date.now();
            });
    }

    getOrders(pair: IPair, userId: IUserId): Promise<IOrder[]> {
        return this._orderRepository.getOrders(this.transformPair(pair), userId)
            .catch(err => {
                logger.log({
                    level: 'error',
                    error: err
                })
                return [];
            });
    }

    saveOrder(pair: IPair, userId: IUserId, order: IOrder) {
        return this._orderRepository.saveOrder(this.transformPair(pair), userId, order)
            .then(() => 
                this._orderRepository.updateLastTrade(
                    this.transformPair(pair), userId, Date.now()
                ));
    }

    deleteOrder(id: IOrder['id']) {
        this._orderRepository.deleteOrder(id)
            .then((order) => this._orderRepository
                .updateLastTrade(order.pair, order.userId, Date.now()
            ));
    }
}

export default OrderService;
