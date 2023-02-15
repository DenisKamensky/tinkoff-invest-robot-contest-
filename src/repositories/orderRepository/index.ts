import IOrder from '../../entities/order';
import IPair from "../../entities/pair";
import { IUserId } from "../../entities/user";

export interface IOrderRepositrory {
    getLastOrderTime: (pair: string, userId: IUserId) => Promise<number | null>,
    getOrders: (pair: string, userId: IUserId) => Promise<IOrder[]>,
    saveOrder: (pair: string, userId: IUserId, order: IOrder) => Promise<void>,
    deleteOrder: (id: IOrder['id']) => Promise<{time: number, pair: string, userId: IUserId}>,
    updateLastTrade: (pair: string, userId: IUserId, time: number) => void,
};
