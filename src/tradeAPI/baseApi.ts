import * as fetch from "node-fetch";

import ICandle from "../entities/candle";
import IOrder from "../entities/order";
import IPair from "../entities/pair";

declare var logger;

export type IConfig = {[key: string]: any};
abstract class TradeAPI {
  [x: string]: any;
  protected config: IConfig;

  public setConfig(config: IConfig) {
    this.config = config;
  }
  public abstract getCandleStick(pair: IPair): Promise<ICandle[]>;
  public abstract getOrders(pair: IPair, params?: any): Promise<IOrder[]>;
  public abstract getMinLotSize(pair: IPair): Promise<number>;
  public abstract getOrderQuantity(ticker: string, price: number, limit: number): Promise<number>;
  public abstract sell(pair: IPair, orderQuantity: number, price: number): Promise<any>;
  public abstract buy(pair: IPair, orderQuantity: number, price: number): Promise<any>;
  public abstract getPairBalance(pair: IPair): Promise<any>;

  protected abstract createAuthHeader(): {[key: string]: string};
  /**
   * method that checks fetch errors
   */
  protected abstract detectFetchError(data): void;
  protected async fetch(
    {url, customParams = {}, body}: {url: string, body?: any, customParams?: any},
    ) {
    const defaultParams = {
      body: body && JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...this.createAuthHeader(),
      },

    };
    const params = Object.assign(defaultParams, customParams);

    try {
      const response = await fetch(url, params);
      const data = await response.json();
      this.detectFetchError(data);
      return data;
    } catch (error) {
      logger.log({
        level: "error",
        message: error.message,
        stack: error.stack,
      });
    }
  }

  public emitNextCandles() {
    return;
  }
}

export default TradeAPI;
