import {createHmac} from "crypto";

import ICandle from "../entities/candle";
import IOrder from "../entities/order";
import IPair from "../entities/pair";
import TRADE_DIRECTIONS from "../entities/tradeDirections";

import TradeAPI from "./baseApi";

type IBananceCandle = string[];

class Binance extends TradeAPI {
  private LINKS = {
    ACCOUNT: "account",
    ALL_ORDERS: "allOrders",
    CANDLE_STICK: "klines",
    DEPTH: "depth",
    EXCHANGE_INFO: "exchangeInfo",
    OPEN_ORDERS: "openOrders",
    ORDER: "order",
    TICKER_PRICE: "ticker/price",
  };

  // @TODO: create common interface
  static get ORDER_TYPES() {
    return Object.freeze({
      LIMIT: "LIMIT",
      LIMIT_MAKER: "LIMIT_MAKER",
      MARKET: "MARKET",
      STOP_LOSS: "STOP_LOSS",
      STOP_LOSS_LIMIT: "STOP_LOSS_LIMIT",
      TAKE_PROFIT: "TAKE_PROFIT",
      TAKE_PROFIT_LIMIT: "TAKE_PROFIT_LIMIT",
    });
  }

  public createPairName({take, make}: IPair): string {
    return `${make}${take}`;
  }

  public async getExchangeInfo(pair: IPair) {
    const pairName = this.createPairName(pair);
    const {symbols} = await this.get(this.LINKS.EXCHANGE_INFO, false);
    const currentPair = symbols.find(({symbol}) => symbol === pairName);
    return currentPair;

  }

  public async getMinLotSize(pair: IPair) {
    const exchangeInfo = await this.getExchangeInfo(pair);
    const lotSize =  exchangeInfo.filters.find(({filterType}) => filterType === "MIN_NOTIONAL").minNotional;
    const multiplicator = pair.minLotQuantity || 1.5;
    return Number(lotSize) * multiplicator;
  }

  public async getAccauntInfo() {
    return this.get(this.LINKS.ACCOUNT);
  }

  public async getBalance(ticker: string, balances = []) {
    const tikerBalance = balances.find(({asset}) => asset === ticker);
    if (tikerBalance) {
      return Number(tikerBalance.free);
    }
  }

  public async getDepth(pair: IPair) {
    return this.get(this.LINKS.DEPTH, false, {symbol: this.createPairName(pair)});
  }

  public async sell(pair, quantity, price) {
    return this.placeOrder({
      price,
      quantity,
      side: TRADE_DIRECTIONS.SELL,
      symbol: this.createPairName(pair),
      type: Binance.ORDER_TYPES.MARKET,
    });
  }

  public async buy(pair, quantity, price) {
    return this.placeOrder({
      price,
      quantity,
      side: TRADE_DIRECTIONS.BUY,
      symbol: this.createPairName(pair),
      type: Binance.ORDER_TYPES.MARKET,
    });
  }

  public async cancelOrder(symbol, orderId) {
    const params = {
      orderId,
      symbol,
    };
    return this.delete(this.createUrl(this.LINKS.ORDER, true, params));
  }

  public async getOpenOrders(pair) {
    const params = {
      symbol: this.createPairName(pair),
    };
    return this.get(this.LINKS.OPEN_ORDERS, true, params);
  }

  public async getPairPrice(pair) {
    return this.get(
      this.LINKS.TICKER_PRICE,
      false,
      {symbol: this.createPairName(pair)},
    );
  }

  public async getCandleStick(pair: IPair) {
    const candleRawInfo = await this.get(
        this.LINKS.CANDLE_STICK,
        false,
        {
          symbol: this.createPairName(pair),
          ...pair.candlesConfig,
        },
    );
    if (!Array.isArray(candleRawInfo)) {
      return [];
    }
    return candleRawInfo.map(this.transformToCandleInterface);
  }

  public async getOrderQuantity(ticker: string, price: number, limit: number) {
    const {balances} = await this.getAccauntInfo();
    const tickerBalance = await this.getBalance(ticker, balances);
    const orderQuantity = limit / price;

    if (isNaN(orderQuantity) || tickerBalance < orderQuantity) {
      return;
    }
    return orderQuantity;
  }

  public async getPairBalance(pair: IPair) {
    const {balances} = await this.getAccauntInfo();
    const sellBalance = await this.getBalance(pair.make, balances);
    const buyBalance = await this.getBalance(pair.take, balances);

    return {
      [pair.make]: sellBalance,
      [pair.take]: buyBalance,
    };
  }

  public async getOrders(pair, params = {}) {
    const orders = await this.get(
      this.LINKS.ALL_ORDERS,
      true,
      {
        symbol: this.createPairName(pair),
        ...params,
      },
    );
    orders.reverse();

    return orders.map((order) => ({...order, side: order.side.toLowerCase()}));
  }

  protected createAuthHeader(): {[key: string]: string} {
    return {
      "X-MBX-APIKEY": this.config.key,
    };
  }

  protected detectFetchError(data) {
    if (data.code) {
      throw new Error(JSON.stringify(data));
    }
  }

  private transformToCandleInterface(rawCandle: IBananceCandle): ICandle {
    const [
      openningTime,
      openningPrice,
      higherPrice,
      lowerPrice,
      closingPrice,
      volume,
      closeTime,
    ] = rawCandle.map((field) => Number(field));
    return {
      closeTime,
      closingPrice,
      higherPrice,
      lowerPrice,
      openningPrice,
      openningTime,
      volume,
    };
  }
  /**
   * creates special auth for params
   */
  private signParams(requestUrl: URL): void {
    requestUrl.searchParams.append(
      "signature",
      createHmac("sha256", this.config.secret).update(requestUrl.searchParams.toString()).digest("hex"),
    );
  }

  private createUrl(url: string, isAuth?: boolean, queryParams: any = {}): string {
    const requestUrl = new URL(url, this.config.baseUrl);
    const defaultQueryParams: {timestamp?: number } = {};

    if (isAuth) {
      defaultQueryParams.timestamp = Date.now();
    }

    queryParams = Object.assign(defaultQueryParams, queryParams);

    Object.keys(queryParams).forEach((key) => {
      requestUrl.searchParams.append(key, queryParams[key]);
    });

    if (isAuth) {
      this.signParams(requestUrl);
    }

    return requestUrl.toString();
  }

  private get(url: string, isAuth = true, queryParams?: any, params: {headers?: any} = {}) {
    const defaultParams = {
      headers: {},
      method: "get",
    };

    params = Object.assign(defaultParams, params);
    if (isAuth) {
      params.headers = Object.assign({}, params.headers, this.createAuthHeader());
    }
    return this.fetch({
      customParams: params,
      url: this.createUrl(url, isAuth, queryParams),
    });
  }

  private post(url: string, body?: any) {
    return this.fetch({url, body, customParams: {method: "post"}});
  }

  private delete(url: string, body?: any) {
    return this.fetch({url, body, customParams: {method: "delete"}});
  }
  private transformToOrder(rawOrder): IOrder {
    rawOrder.time = rawOrder.transactTime;
    rawOrder.id = rawOrder.orderId;
    return rawOrder;
  }
  private placeOrder({
    symbol,
    side,
    type,
    quantity,
    price,
    timeInForce = "GTC",
  }) {
    return this.post(
      this.createUrl(
        this.LINKS.ORDER,
        true,
        {
          // price,
          quantity,
          side,
          symbol,
          // timeInForce: type === Binance.ORDER_TYPES.MARKET ? undefined : timeInForce,
          type,
        }),
    ).then(order => this.transformToOrder(order));
  }
}

export default Binance;
