import {createHmac} from "crypto";

import ICandle from "../entities/candle";
import IOrder from "../entities/order";
import IPair from "../entities/pair";
import TRADE_DIRECTIONS from "../entities/tradeDirections";

import TradeAPI from "./baseApi";

type IBananceCandle = string[];

class Binance extends TradeAPI {
  public get SUPPORT_SAVINGS() {return true;}
  private get REDEEM_TYPES() {
    return {
      FAST: "FAST",
      NORMAL: "NORMAL",
    }
  }
  private get LINKS() {
    const BASE_API_ENDPOINT = "api/v3/";
    const SAVINGS_API_ENDPOINT = "sapi/v1/lending/daily/";
    return {
      ACCOUNT: `${BASE_API_ENDPOINT}account`,
      ALL_ORDERS: `${BASE_API_ENDPOINT}allOrders`,
      CANDLE_STICK: `${BASE_API_ENDPOINT}klines`,
      DEPTH: `${BASE_API_ENDPOINT}depth`,
      EXCHANGE_INFO: `${BASE_API_ENDPOINT}exchangeInfo`,
      OPEN_ORDERS: `${BASE_API_ENDPOINT}openOrders`,
      ORDER: `${BASE_API_ENDPOINT}order`,
      TICKER_PRICE: `${BASE_API_ENDPOINT}ticker/price`,
      GET_SAVING_LIST: `${SAVINGS_API_ENDPOINT}product/list`,
      GET_SAVING_PURHCASE_QUOTA: `${SAVINGS_API_ENDPOINT}userLeftQuota`,
      GET_SAVING_REDEMPTION_QUOTA: `${SAVINGS_API_ENDPOINT}userRedemptionQuota`,
      PURCHASE_SAVING: `${SAVINGS_API_ENDPOINT}purchase`,
      REDEEM_SAVING: `${SAVINGS_API_ENDPOINT}redeem`,
    };
  }

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
      [pair.make]: Number(sellBalance),
      [pair.take]: Number(buyBalance),
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

  public async getSavingsList({make}: IPair) {
    return this.get(
      this.LINKS.GET_SAVING_LIST,
      true,
      {
        asset: make,
      }
    )
  }

  public async getSavingsPurchaseQuota({make}: IPair, productId?: string) {
    return this.get(
      this.LINKS.GET_SAVING_PURHCASE_QUOTA,
      true,
      {
        type: this.REDEEM_TYPES.FAST,
        productId: productId || `${this.createSavingProductId(make)}`,
      }
    )
  }
  
  public async getSavingsRedemprionQuota({make}: IPair, productId?: string) {
    return this.get(
      this.LINKS.GET_SAVING_REDEMPTION_QUOTA,
      true,
      {
        asset: make,
        productId: productId || `${this.createSavingProductId(make)}`,
      }
    )
  }

  public async buySaving({make}: IPair, amount: number, productId?: string) {
    return this.post(
      this.createUrl(
        this.LINKS.PURCHASE_SAVING,
        true,
        {
          productId: productId || this.createSavingProductId(make),
          amount,
        },
    ));
  }


  public async redeemSaving({make}: IPair, amount: number, productId?: string) {
    return this.post(
      this.createUrl(
        this.LINKS.REDEEM_SAVING,
        true,
        {
          productId: productId || this.createSavingProductId(make),
          type: this.REDEEM_TYPES.FAST,
          amount,
        },
    ));
  }

  private createSavingProductId(assetName: string) {
    const POSTFIX = '001';
    return assetName + POSTFIX;
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

  private post<T>(url: string, body?: T) {
    return this.fetch({url, body, customParams: {method: "post"}});
  }

  private delete(url: string, body?: any) {
    return this.fetch({url, body, customParams: {method: "delete"}});
  }
  private transformToOrder(rawOrder): IOrder {
    rawOrder.time = rawOrder.transactTime;
    rawOrder.id = rawOrder.orderId;
    rawOrder.quantity = Number(rawOrder.executedQty);
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
