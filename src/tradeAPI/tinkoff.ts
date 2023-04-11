import NodeCache from "node-cache";
import IPair from "../entities/pair";
import ICandle from "../entities/candle";
import TradeAPIs from "../entities/tradeAPIs";
import tinkoffLegacyApi from "../utils/tinkoff-legacy-sdk";
import {TRANSFORM_MEASURES, convert as convetTime} from "../utils/timeConverter";
import TRADE_DIRECTIONS from "../entities/tradeDirections";
import Queue from "../utils/dataStructures/queue";
import {parseTimeFromConfig, delay} from "../utils";
import TradeAPI, {IConfig} from "./baseApi";
import { IStrategyNames } from "../entities/strategyNames";

declare var logger;

const log = (logBody, method, level = 'error') => (logger.log({
  level,
  logBody,
  method: `Tinkoff api method ${method}`,
}))

type IContext = {
  getCandles: Function,
  getInstrument: Function,
  getOrders: Function,
  getPortfolio: Function,
  getBalance: Function,
  makeOrder: Function,
  getOrderBook: Function,
}

const enum CANDLE_INTERVAL {
  CANDLE_INTERVAL_UNSPECIFIED = 0, //Интервал не определён.
  CANDLE_INTERVAL_1_MIN = 1, //1 минута.
  CANDLE_INTERVAL_5_MIN = 2, //5 минут.
  CANDLE_INTERVAL_15_MIN = 3, //15 минут.
  CANDLE_INTERVAL_HOUR = 4, //1 час.
  CANDLE_INTERVAL_DAY = 5, //1 день.
}

interface ITinkoffCandle {
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  time: string,
  is_complite: boolean,
}

const DAYS_IN_YEAR = 365;
const DAYS_IN_WEEK = 7;
const DAY = 1;
const MAX_REQUEST_PERMINUTE = 100;
const MAX_CANDLE_INTERVAL = {
  [CANDLE_INTERVAL.CANDLE_INTERVAL_1_MIN]: DAY,
  [CANDLE_INTERVAL.CANDLE_INTERVAL_5_MIN]: DAY,
  [CANDLE_INTERVAL.CANDLE_INTERVAL_15_MIN]: DAY,
  [CANDLE_INTERVAL.CANDLE_INTERVAL_HOUR]: DAYS_IN_WEEK,
  [CANDLE_INTERVAL.CANDLE_INTERVAL_DAY]: DAYS_IN_YEAR,
}
const RUB_FIGI = 'FG0000000000';

const ORDERS_CACHE = {};

const cache = new NodeCache(
  { 
    stdTTL: convetTime(1, TRANSFORM_MEASURES.DAYS, TRANSFORM_MEASURES.SECONDS), // update cache once per day
  }
);


const saveOrderToCache = (order, account_id) => {
  const MAX_ORDERS_IN_CACHE = 100;
  if (!ORDERS_CACHE[account_id]) {
    ORDERS_CACHE[account_id] = [];
  }

  if (ORDERS_CACHE[account_id].length > MAX_ORDERS_IN_CACHE) {
    ORDERS_CACHE[account_id].shift();
  }

  ORDERS_CACHE[account_id].push(order)
}

const getOrdersFromCache = account_id => ORDERS_CACHE[account_id] || [];

const prepareOrderParams = params => {
  delete params.price; // deleting this field to create a MARKET order
  return params;
}

const createCommonCtx = api => ({
  getCandles: async (params) => {
    try {
      const candles = await api.MarketData.GetCandles(params).then(response => response.candles);
      if (params.limit && candles.length > params.limit) {
        // cut extra candles those we don't need
        candles.splice(0, candles.length - params.limit);
      }
      return candles;
    } catch (err) {
    log(err, 'getCandles');
    return [];
    }
    
  },
  getInstrument: async (ticker: string, type = 'Shares') => {
    try {
      let targetInstrument = cache.get(ticker);
      if (targetInstrument) {
        return targetInstrument;
      }
      let instrumentsByType: any[] = cache.get(type);
      if (!instrumentsByType) {
        await api.Instruments[type]({instrument_status: 'INSTRUMENT_STATUS_BASE'})
        .then(r => {
          cache.set(type, r.instruments);
          instrumentsByType = r.instruments;
        })
      }
  
      targetInstrument = instrumentsByType.find(i => i.ticker === ticker);
      cache.set(ticker, targetInstrument);
      return targetInstrument;
    } catch (err) {
      log(err, 'getInstrument');
    }
  },
  getBalance: async (figi: string, positions = []) => {
    const instrument = positions.find(position => position.figi === figi);
    return instrument?.quantity || 0;
  },
  getOrderBook: (figi, depth) => {
    try {
      return api.MarketData.GetOrderBook({
        figi,
        depth,
      })
    } catch (err) {
      log(err, 'getOrderBook');
    }
  },
})

const createSandboxCtx = (api): IContext => ({
  ...createCommonCtx(api),
  getOrders: async ({
    account_id,
  }) => {
    try {
      return api.Sandbox.GetSandboxOrders({
          account_id,
      }).then(response => response.orders);
    } catch (err) {
      log(err, 'getSandboxOrders');
      return [];
    }
  },
  getPortfolio: async (account_id) => {
    try {
      return api.Sandbox.GetSandboxPortfolio({
        account_id
      })
    } catch (err) {
      log(err, 'getSandboxPortfolio');
      return {positions: []}
    }
  },
  makeOrder: async (params) => {
    try {
      const orderParams = prepareOrderParams(params);
      const order = await  api.Sandbox.PostSandboxOrder(orderParams);
      saveOrderToCache({
        ...order,
        time: Date.now(),
      }, params.account_id);
      return order;
    } catch (err) {
      log(err, 'postSandboxOrder');
      return {};
    }
  }
})


const createProductionCtx = (api): IContext => ({
  ...createCommonCtx(api),
  getOrders: async ({
    account_id,
  }) => {
    try {
      const orders = await api.Orders.GetOrders({
        account_id,
      }).then(response => response.orders);
      return orders;
    } catch (err) {
      log(err, 'getOrders');
      return [];
    }
  },
  getPortfolio: async (account_id) => {
    try {
      return api.Operations.GetPortfolio({
        account_id
      })
    } catch (err) {
      log(err, 'getPortfolio');
      return {positions: []}
    }
  },
  makeOrder: async (params) => {
    try {
      const orderParams = prepareOrderParams(params);
      const order = await api.Orders.PostOrder(orderParams)
      saveOrderToCache({
        ...order,
        time: Date.now()
      }, params.account_id);
      return  order;
    } catch (err) {
      log(err, 'postOrder');
      return {};
    }
  }
})

class TinkoffApi extends TradeAPI {
  private _api;
  private historicalCandlesQueue = new Queue();
  private get isSandBoxMode() {
    return this.config?.isSandBox;
  };
  private get ctx() {
    return this.isSandBoxMode
      ? createSandboxCtx(this._api)
      : createProductionCtx(this._api)
  }

  public async buy(pair: IPair, calculatedQuantity?: number, price?: number, figi?: string, account_id?: string) {
    if (!figi) {
      figi = await this.ctx.getInstrument(pair.make, pair.makeType);
    }
    const quantity = calculatedQuantity || await this.getMinLotSize(pair);
    return this.ctx.makeOrder({
      figi,
      quantity,
      account_id: account_id || this.config.account_id,
      direction: 'ORDER_DIRECTION_BUY',
      order_type: 'ORDER_TYPE_MARKET',
    })
  }

  public setConfig(config: IConfig) {
    this.config = config;
    this._api = tinkoffLegacyApi.call(tinkoffLegacyApi, {
      token: config.key,
      appName: 'DenisKamesnky',
    });
  }
  protected createAuthHeader() {
    return {
      token: this.config.apiKey
    };
  }


  protected detectFetchError(data) {
    if (data.code) {
      throw new Error(JSON.stringify(data));
    }
  }

  private calculateCandelIntervalConfig(pair: IPair) {
    const {numericValue, timeUnit} = parseTimeFromConfig(pair.candlesConfig.interval);
    let interval;
    // takes date from config or creates new date with current time
    let to = pair.candlesConfig.to
      ? new Date(pair.candlesConfig.to)
      : new Date();
    if (timeUnit === TRANSFORM_MEASURES.DAYS) {
      interval = CANDLE_INTERVAL.CANDLE_INTERVAL_DAY;
    }

    if (timeUnit === TRANSFORM_MEASURES.HOURS) {
      interval = CANDLE_INTERVAL.CANDLE_INTERVAL_HOUR;
    }

    if (timeUnit === TRANSFORM_MEASURES.MINUTES) {
      if (numericValue === 1) {
        interval = CANDLE_INTERVAL.CANDLE_INTERVAL_1_MIN;
      }

      if (numericValue === 5) {
        interval = CANDLE_INTERVAL.CANDLE_INTERVAL_5_MIN;
      }

      if (numericValue === 15) {
        interval = CANDLE_INTERVAL.CANDLE_INTERVAL_15_MIN;
      }
    }

    let from;
    if (pair.candlesConfig.from) {
      from = new Date(pair.candlesConfig.from);
    } else {
      const lastCandleTime = Date.parse(to.toUTCString());
      const timeOffset = convetTime(pair.candlesConfig.limit * numericValue, timeUnit, TRANSFORM_MEASURES.MILLISECONDS);
      /*
        if we use pricise timeOffset from config,
        perhaps we will get less candles that we expected
        because of the weekends and hollydays when stock exchange doesn't work.
        to avoid that we use coofitient to get even more candles that we expect in one request
        and later we can cut candles that we don't want to use
      */
      const EXTENDING_COOFICIENT = 3;
      from = new Date(lastCandleTime - (timeOffset * EXTENDING_COOFICIENT));
    }
    return {
      from,
      to,
      interval,
    }
  }


  private transformToCandleInterface(rawCandle: ITinkoffCandle): ICandle {
    return {
      closingPrice: rawCandle.close,
      higherPrice: rawCandle.high,
      lowerPrice: rawCandle.low,
      openningPrice: rawCandle.open,
      volume: rawCandle.volume,
      openningTime: Date.parse(rawCandle.time),
    };
  }
  public async getCandleStick(pair: IPair) {
    const {from, to, interval} = this.calculateCandelIntervalConfig(pair);
    const instrument = await this.ctx.getInstrument(pair.make, pair.makeType);
    const candles = await this.ctx.getCandles({
      figi: instrument?.figi,
      from,
      to,
      interval,
      limit: pair.candlesConfig.limit
    });

    return (candles || []).map(this.transformToCandleInterface)
  }

  public async getMinLotSize(pair: IPair) {
    return isNaN(pair.minLotQuantity)
      ? 1
      : pair.minLotQuantity;
  }


  public async getOrderQuantity(ticker: string, price: number, limit: number) {
    const portfolio = await this.ctx.getPortfolio(this.config.account_id);
    const instrument = await this.ctx.getInstrument(ticker);
    const tickerBalance = await this.ctx.getBalance(instrument?.figi, portfolio.positions);
    const orderQuantity = limit;
    if (isNaN(orderQuantity) || tickerBalance < orderQuantity) {
      return 0;
    }
    return orderQuantity < 1 ? 1 : orderQuantity;
  }


  public async getOrders(pair, params = {} as any) {
    const instrument = await this.ctx.getInstrument(pair.make, pair.makeType);
    const resultOrders = [];
    const orders = getOrdersFromCache(this.config.account_id);
    orders.forEach(order => {
      if (order.figi !== instrument?.figi) {
        return;
      }
      resultOrders.push({
        ...order,
        side: order.direction === 'ORDER_DIRECTION_SELL' 
          ? TRADE_DIRECTIONS.SELL
          : TRADE_DIRECTIONS.BUY,
      })
    })

    return resultOrders;
  }

  public async sell(pair: IPair, quantity: number, price?: number, figi?: string, account_id?: string) {
    if (!figi) {
      figi = await this.ctx.getInstrument(pair.make, pair.makeType); 
    }
    return this.ctx.makeOrder({
      figi,
      quantity,
      account_id: account_id || this.config.account_id,
      direction: 'ORDER_DIRECTION_SELL',
      order_type: 'ORDER_TYPE_MARKET',
    });
  }

  public getPairBalance(pair: IPair) {
    return this.ctx.getPortfolio(this.config.account_id);
  }

  public getPortfolio(accountId: string) {
    const parsePosition = position => {
      const nkd = parseFloat(position.current_nkd);
      return {
        ...position,
        average_position_price: parseFloat(position.average_position_price),
        current_price: parseFloat(position.current_price),
        current_nkd: isNaN(nkd) ? 0 : nkd,
        average_position_price_fifo: parseFloat(position.average_position_price_fifo),
      }
    }
    return this.ctx.getPortfolio(accountId).then(response => {
      response.positions = response.positions.map(parsePosition);
      return response;
    });
  }

  public async getOrderBook(pair: IPair, depth: number) {
    const {figi} = await this.ctx.getInstrument(pair.make, pair.makeType) || {};
    return this.ctx.getOrderBook(figi, depth)
  }

  private splitHistoricalCandlesByIntervals(from: string, to: string, interval) {
    const requestOffset = Date.parse(to) - Date.parse(from);
    const requestOffsetInDays = Math.ceil(convetTime(requestOffset, TRANSFORM_MEASURES.MILLISECONDS, TRANSFORM_MEASURES.DAYS));
    const requestFrames = [];
    const maxInterval = MAX_CANDLE_INTERVAL[interval];

    if (requestOffsetInDays <= maxInterval) {
      requestFrames.push({from, to});
    } else {
      let chunksQuantity = Math.ceil(requestOffsetInDays / maxInterval);
      let startDate = new Date(from);
      while(chunksQuantity) {
        const startFrom = startDate.toISOString();
        startDate.setDate(startDate.getDate() + maxInterval);
        const endOn = startDate.toISOString();
        requestFrames.push({
          from: startFrom,
          to: endOn,
        })
        chunksQuantity--;
      }
    }
    return requestFrames;
  }
  public async loadHistoricalCandles({
      ticker,
      from,
      to,
      interval
    }:
    {
      ticker: string,
      from: string,
      to: string,
      interval: string
    }) {
    const defaultParams = {
      take: 'RUB',
      make: ticker,
      apiName: TradeAPIs.TINKOFF,
      strategyName: IStrategyNames.DCA,
      execTime: "* * * * * *",
    }
    const {interval: candleInterval} = this.calculateCandelIntervalConfig({
      ...defaultParams,
      candlesConfig: {
        interval,
        from,
        to
      }
    });

    const requestFrames = this.splitHistoricalCandlesByIntervals(from, to, candleInterval);
    let chunksCounter = 1;
    if (requestFrames.length > MAX_REQUEST_PERMINUTE) {
      chunksCounter = Math.ceil(requestFrames.length / MAX_REQUEST_PERMINUTE);
      logger.log('допустимый объем загружаемых данных в минуту превышен');
      logger.log(`чтобы осуществить загрузку данных запрос разделен на ${chunksCounter} подзапросов и будет выполнен за ${chunksCounter} минут(ы), пожалуйста, подождите`)
    }
    let currentChunkStart = 0;
    while(chunksCounter) {
      let currentChunkEnd = currentChunkStart + MAX_REQUEST_PERMINUTE;
      this.historicalCandlesQueue.enq(requestFrames.slice(currentChunkStart, currentChunkEnd));
      currentChunkStart = currentChunkEnd;
      chunksCounter--;
    }
    logger.log('начата загрузка исторических данных');
    
    let commonResult = [];

    const mapFn = timeParams => this.getCandleStick({
      ...defaultParams,
      candlesConfig: {
        interval,
        from: timeParams.from,
        to: timeParams.to
      }
    }).catch(err => {
      log(err, 'loadHistoricalCandles - ошибка загрузки фрагмента исторических данных');
      return [];
    });

    const loadFromQueue = async (currentChunk) => {
      if (!currentChunk) {
        return;
      }
      const candles = await Promise.all(currentChunk.map(mapFn));
      candles.forEach((chunk: ICandle[]) => {
        commonResult = [...commonResult, ...chunk];
      });
      logger.log(`фрагмент загружен успешно`);

      if (this.historicalCandlesQueue.size) {
        logger.log(`загрузка будет завершенна через ${this.historicalCandlesQueue.size} минут(ы)`)
        currentChunk = this.historicalCandlesQueue.deq();
        await delay(convetTime(1, TRANSFORM_MEASURES.MINUTES, TRANSFORM_MEASURES.MILLISECONDS));
      } else {
        currentChunk = undefined;
      }
      return loadFromQueue(currentChunk);
    }

    await loadFromQueue(this.historicalCandlesQueue.deq());

    logger.log('исторические данные успешно загруженны');
    return commonResult;
  }

}

export default TinkoffApi;
