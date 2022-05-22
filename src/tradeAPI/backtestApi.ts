import {EventEmitter} from "events";
import TradeAPI from "./baseApi";
import IPair from "../entities/pair";
import TRADE_DIRECTIONS from "../entities/tradeDirections";

export const enum API_EVENTS {
  ALL_CANDLES_LOADED = 'done',
  LOAD_NEXT_CHUNK = 'loadNext',
}

const eventEmitter = new EventEmitter();
class BacktestApi extends TradeAPI {
  private candelsStickFragmentStartIdx = 0;
  private orders = [];
  public setConfig(config) {
    this.config = config;
  }

  private createOrder(orderDirection: TRADE_DIRECTIONS) {
    const candleIndex = this.candelsStickFragmentStartIdx;
    const currentCandle = this.config.candlesCache[candleIndex];
    currentCandle.tradeSide = orderDirection;
    const order = {
      side: orderDirection,
      time: currentCandle.openningTime,
    };
    this.orders.push(order);
    return order;
  }
  public async buy(pair, quantity, price) {
    return this.createOrder(TRADE_DIRECTIONS.BUY);
  }

  public async sell(pair, quantity, price) {
    return this.createOrder(TRADE_DIRECTIONS.SELL);
  }

  protected createAuthHeader(): {[key: string]: string} {
    return {'': ''};
  }

  protected detectFetchError(data) {
    if (data.code) {
      throw new Error(JSON.stringify(data));
    }
  }

  public async getCandleStick(pair: IPair) {
    const startIndex = this.candelsStickFragmentStartIdx;
    const endIndex = startIndex + pair.candlesConfig.limit;
    const candlesFragment = this.config.candlesCache.slice(startIndex, endIndex);

    this.candelsStickFragmentStartIdx = endIndex;
    return candlesFragment;
  }

  public async getMinLotSize(pair: IPair) {
    return pair.minLotQuantity || 1;
  }

  public async getOrderQuantity(ticker: string, price: number, limit: number) {
    return 1;
  }

  // @TODO: 
  public async getOrders(pair, params = {} as any) {
    return this.orders;
  }

  public async getPairBalance(pair: IPair) {
    return {};
  }

  public emitNextCandles() {
    if (this.candelsStickFragmentStartIdx >= this.config.candlesCache.length) {
      process.nextTick(() => eventEmitter.emit(API_EVENTS.ALL_CANDLES_LOADED));
      return;
    } 
    eventEmitter.emit(API_EVENTS.LOAD_NEXT_CHUNK);
  }

  public subscribeOn(eventType: API_EVENTS, cb) {
    eventEmitter.addListener(eventType, cb);
  }

  public getCandleResults() {
    return this.config.candlesCache;
  }
}

export default BacktestApi;
