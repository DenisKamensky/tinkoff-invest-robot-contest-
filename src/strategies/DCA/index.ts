import {ITransition} from "../../utils/stateMachine";
import {IUserId} from "../../entities/user";
import TradeAPI from "../../tradeAPI/baseApi";
import IPair from "../../entities/pair";
import db from "../../db";
import TradeAPIs from "../../entities/tradeAPIs";
import {convertTime, getConfigQuantityFormaters, parseTimeFromConfig, TRANSFORM_MEASURES} from "../../utils";
import ICandle from "../../entities/candle";
import IOrder from "../../entities/order";

declare var logger;
const loggerLog = (params) => {
    if (params.api === TradeAPIs.BACKTEST) {
      return;
    }
    logger.log(params);
  }

const stateMachine: ITransition = {
    init: {
        exec(pair: IPair, api: TradeAPI, userId: IUserId) {
            this.dispatch("readCachedOrders", pair, api, userId);
        },
        async readCachedOrders(pair, api, userId) {
            const orders = await db.getOrders(pair, userId);
            const candles = await api.getCandleStick(pair);

            if (!candles.length) {
                return;
            }

            const lastCandle = candles[candles.length - 1];
            this.changeState("analyze");
            this.dispatch("makeDesigion", pair, api, userId, orders, lastCandle);
        }
    },
    analyze: {
        async makeDesigion(pair: IPair, api: TradeAPI, userId: IUserId, orders: IOrder[], lastCandle?: ICandle) {
            const currentPrice = lastCandle.closingPrice;
            if (!lastCandle) {
                return;
            } 

            const parsedTime = parseTimeFromConfig(pair.candlesConfig.interval);
            const timeGap = convertTime(parsedTime.numericValue, parsedTime.timeUnit, TRANSFORM_MEASURES.MILLISECONDS);
            const validTime = Date.now() - timeGap; 
            const lastOrderTime = await db.getLastOrderTime(pair, userId).then(time => time || validTime - timeGap);
            const hasFreshOrder = validTime < lastOrderTime;
            if (hasFreshOrder) {
                return;
            }
            if (!orders.length) {
                this.changeState("trade");
                this.dispatch("buy", pair, api, userId, currentPrice);
                return;
            }
            
            const closestCheapOrder = orders.find(order => {
                const price = Number(order.price);
                if (!isNaN(price)) {
                    return (price + (pair.offset || 0)) < currentPrice;
                }
            });
            this.changeState("trade");
            if (closestCheapOrder) {
                this.dispatch("sell", pair, api, userId, closestCheapOrder, currentPrice);
            } else {
                const cheapestOrder = orders[orders.length - 1];
                const cheapestOrderPrice = Number(cheapestOrder.price);
                if (!isNaN(cheapestOrderPrice) && cheapestOrderPrice - (pair.offset || 0) > currentPrice) {
                    this.dispatch("buy", pair, api, userId, currentPrice);
                }
            }

        }
    },
    trade: {
        async buy(pair: IPair, api: TradeAPI, userId: IUserId, price: number) {
            try {
                const tradeLimit = await api.getMinLotSize(pair);
                const pairBalance = await api.getPairBalance(pair);
                if (pairBalance[pair.take] <= tradeLimit) {
                    loggerLog({
                        level: "info",
                        message: `low balance to buy, balance: ${pairBalance}, limit: ${tradeLimit}`,
                        api: pair.apiName,
                    });
                    return;
                }
                const transformQuantity = getConfigQuantityFormaters(pair)
                const order = await api.buy(pair, transformQuantity(tradeLimit / price), price);
                const balance = await api.getPairBalance(pair);
                if (!Number(order?.price)) {
                    order.price = price;
                }
                loggerLog({
                  balance: JSON.stringify(balance),
                  level: "info",
                  message: "created buy order",
                  order,
                  api: pair.apiName,
                });
                db.saveOrder(pair, userId, order);
                if (api.SUPPORT_SAVINGS) {
                    api.buySaving(pair, Number(order.quantity));
                }
            } catch (error) {
                loggerLog({
                    level: "error",
                    error,
                    api: pair.apiName,
                });
            }
        },
        async sell(pair: IPair, api: TradeAPI, userId: IUserId, order: IOrder, price: number) {
            try {
                const transformQuantity = getConfigQuantityFormaters(pair);
                const orderQuantity = transformQuantity(Number(order.quantity || order.origQty));
                const initialBalance = await api.getPairBalance(pair);
                if (initialBalance[pair.make] < orderQuantity) {
                    if (!api.SUPPORT_SAVINGS) return;
                    await api.redeemSaving(pair, orderQuantity);
                };
                const sellOrder = await api.sell(pair, orderQuantity, price);
                const balance = await api.getPairBalance(pair);
                loggerLog({
                    balance,
                    level: "info",
                    message: "created sell order",
                    order: sellOrder,
                    api: pair.apiName,
                  });
                //@TODO: fix after all date will be created according to the common interface
                db.deleteOrder(String(order.id || order.orderId));
            } catch(error) {
                loggerLog({
                    level: "error",
                    error,
                    api: pair.apiName,
                });
            }

        }
    }
}

export default stateMachine;
