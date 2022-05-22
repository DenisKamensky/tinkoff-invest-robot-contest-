import {get} from "underscore";
import ICandle from "../entities/candle";
import IPair from "../entities/pair";
import TRADE_DIRECTIONS from "../entities/tradeDirections";
import {parseTimeFromConfig, TRANSFORM_MEASURES} from "../utils";

import BaseAPI from "./baseApi";

interface IAlpacaCandle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
class AlpacaAPI extends BaseAPI {
  private get LINKS() {
    return {
      ACCOUNT: "account",
      BARS: this.dataUrl + "bars/",
      EXCHANGE_INFO: "exchangeInfo",
      ORDERS: this.config.baseUrl + "orders",
      POSITIONS: this.config.baseUrl + "positions",
    };
  }

  private get OREDER_TYPES() {
    return {
      LIMIT: "limit",
      MARKET: "market",
    };
  }
  private dataUrl: string = "https://data.alpaca.markets/v1/";

  public async getCandleStick(pair: IPair) {
    const symbols = pair.make;
    const timeInterval = this.parseTimeInterval(pair);
    const rawCandles = await this.get(
      `${this.LINKS.BARS}${timeInterval}`,
      {
        limit: pair.candlesConfig.limit,
        symbols,
      },
    );
    return rawCandles[symbols].map(this.transformToCandleInterface);
  }

  public async getOrders(pair: IPair) {
    const orders = await this.get(
      this.LINKS.ORDERS,
      {
        status: "all",
        symbols: pair.make,
      },
    );

    return orders
      .map((order) => (
        {
          ...order,
          time: Date.parse(order.created_at),
        }));
  }

  public getMinLotSize(pair: IPair) {
    return Promise.resolve(1 * (pair.minLotQuantity || 1));
  }

  public async getOrderQuantity(ticker: string, price: number, limit: number) {
    const tickerValue = await this.getPositionInfo(ticker);
    if (!ticker) {
      return 0;
    }
    const tickerBalance = Number(get(tickerValue, "qty", 0));

    if (tickerBalance < limit) {
      return 0;
    }
    return limit;
  }

  public async sell(pair: IPair, orderQuantity: number, price: number) {
    const lotSize = await this.getMinLotSize(pair);
    return this.createOrder(TRADE_DIRECTIONS.SELL, lotSize, pair.make, price);
  }

  public async buy(pair: IPair, orderQuantity: number, price: number) {
    const lotSize = await this.getMinLotSize(pair);
    return this.createOrder(TRADE_DIRECTIONS.BUY, lotSize, pair.make, price);
  }

  public async getPairBalance(pair) {
    return {};
  }

  protected detectFetchError(data) {
    if (data.message) {
      throw new Error(JSON.stringify(data));
    }
  }

  protected createAuthHeader(): {[key: string]: string} {
    return {
      "APCA-API-KEY-ID": String(this.config.apiKey),
      "APCA-API-SECRET-KEY": String(this.config.secretKey),
    };
  }

  private transformToCandleInterface(rawCandle: IAlpacaCandle): ICandle {
    const {
      t: openningTime,
      o: openningPrice,
      h: higherPrice,
      l: lowerPrice,
      c: closingPrice,
      v: volume,
    } = rawCandle;
    return {
      closingPrice,
      higherPrice,
      lowerPrice,
      openningPrice,
      openningTime,
      volume,
    };
  }

  private get(requestUrl: string, queryParams: any = {}) {
    const url: URL = new URL(requestUrl);
    Object.keys(queryParams).forEach((key) => {
      url.searchParams.append(key, queryParams[key]);
    });
    return this.fetch(
      {
        customParams: {method: "get"},
        url: url.toString(),
      });
  }

  private post(url: string, body?: any) {
    return this.fetch({url, body, customParams: {method: "post"}});
  }

  private parseTimeInterval(pair: IPair): string {
    const {numericValue, timeUnit} = parseTimeFromConfig(pair.candlesConfig.interval);
    const timeUnits = {
      [TRANSFORM_MEASURES.MINUTES]: "Min",
      [TRANSFORM_MEASURES.HOURS]: "Hour",
      [TRANSFORM_MEASURES.DAYS]: "Day",
    };
    return `${numericValue}${timeUnits[timeUnit]}`;
  }

  private getPositionInfo(ticker: string) {
    return this.get(`${this.LINKS.POSITIONS}/${ticker}`);
  }

  private createOrder(side: TRADE_DIRECTIONS, orderQuantity: number, symbol: string, limitPrice: number) {
    const order = {
      limit_price: limitPrice,
      qty: orderQuantity,
      side,
      symbol,
      time_in_force: "gtc",
      type: this.OREDER_TYPES.MARKET,
    };
    return this.post(this.LINKS.ORDERS, order);
  }
}

export default AlpacaAPI;
