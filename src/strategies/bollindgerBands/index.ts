import {
  convertTime,
  getConfigQuantityFormaters,
  parseTimeFromConfig,
  TRANSFORM_MEASURES,
} from "../../utils";

import {
  getMovingAverage,
  getStandartDeviation,
  getCandleDirection,
} from "../../utils/tradeIndictors";

import ICandle from "../../entities/candle";
import IPair from "../../entities/pair";
import TRADE_DIRECTIONS from "../../entities/tradeDirections";
import {IUserId} from "../../entities/user";
import TradeAPI from "../../tradeAPI/baseApi";
import {isInRange} from "../../utils/math";
import {ITransition} from "../../utils/stateMachine";
import TradeAPIs from "../../entities/tradeAPIs";

declare var logger;

const loggerLog = (params) => {
  if (params.api === TradeAPIs.BACKTEST) {
    return;
  }
  logger.log(params);
}

const getCorridorInfo = (closingPrices: number[]) => {
  const movingAverage = getMovingAverage(closingPrices);
  const standartDeviation = getStandartDeviation(closingPrices);
  const topEdge = movingAverage + (2 * standartDeviation);
  const bottomEdge = movingAverage - (2 * standartDeviation);
  const corridorWidth = topEdge - bottomEdge;
  return {
    movingAverage,
    topEdge,
    standartDeviation,
    bottomEdge,
    closingPrice: closingPrices[closingPrices.length - 1],
    corridorWidth,
  };
};

const stateMachine: ITransition = {
  init: {
    exec(pair: IPair, api: TradeAPI, userId: IUserId) {
      this.dispatch(
        "getCandleStick",
        Object.assign({}, pair, {
          candlesConfig: {
            ...pair.candlesConfig,
            /*
              extend candles list to have an ability
              to calculate corridors for last three candles
            */
            limit: pair.candlesConfig.limit + 2,
          },
        }),
        api,
        );
    },

    async getCandleStick(pair: IPair, api: TradeAPI) {
      const candleInfo = await api.getCandleStick(pair);
      if (!candleInfo.length) {
        return;
      }
      this.changeState("analyze");
      this.dispatch("detectTrend", pair, api, candleInfo);
    },

  },

  analyze: {
    detectTrend(pair: IPair, api: TradeAPI, candles: ICandle[]) {
      const mapFn = (candle) => candle.closingPrice;
      const closingPrices = candles.map(mapFn);
      const currentCorridorData: number[] = closingPrices.slice(2);
      const prevCorridorData: number[] = closingPrices.slice(1, closingPrices.length - 1);
      const beforePrevCorridorData: number[] = closingPrices.slice(0, closingPrices.length - 2);
      const currentCorridor = getCorridorInfo(currentCorridorData);
      const prevCorridor = getCorridorInfo(prevCorridorData);
      const beforePevCorridor = getCorridorInfo(beforePrevCorridorData);

      const isCurrentCandleInCorridor = isInRange(
        [currentCorridor.bottomEdge, currentCorridor.topEdge],
        currentCorridor.closingPrice,
      );

      const isPrevCandleInCorridor = isInRange(
        [prevCorridor.bottomEdge, prevCorridor.topEdge],
        prevCorridor.closingPrice,
      );

      /*
        add smoothing coofitient to react on candles that is close to bands
      */
      const CORRIDOR_OFFSET_PERCENT = pair.corridorOffsetPersent || 5;
      const beforePrevCandleOffest = (beforePevCorridor.corridorWidth / 100) * CORRIDOR_OFFSET_PERCENT;
      const {
        openningPrice: beforePrevOpenningPrice,
        closingPrice: beforePrevClosingPrice,
      } = candles[candles.length - 3];
      const isDefferentDerection = getCandleDirection(candles[candles.length - 3]) !== getCandleDirection(candles[candles.length - 2]);
      const sortedCandleBorders = [beforePrevClosingPrice, beforePrevOpenningPrice].sort((a, b) => a - b);
      const hasTopIntersection =
        sortedCandleBorders[1] > beforePevCorridor.topEdge ||
        Math.abs(beforePevCorridor.topEdge - sortedCandleBorders[1]) <= beforePrevCandleOffest;
      const hasBottomIntersection =
        sortedCandleBorders[0] < beforePevCorridor.bottomEdge ||
        Math.abs(beforePevCorridor.bottomEdge - sortedCandleBorders[0]) <= beforePrevCandleOffest;
      let trend;
      if (hasTopIntersection && isCurrentCandleInCorridor && isPrevCandleInCorridor && isDefferentDerection) {
        trend = TRADE_DIRECTIONS.SELL;
      }

      if (hasBottomIntersection && isCurrentCandleInCorridor && isPrevCandleInCorridor && isDefferentDerection) {
        trend = TRADE_DIRECTIONS.BUY;
      }

      if (trend) {
        this.dispatch("makeDesigion", pair, api, {trend, price: currentCorridor.closingPrice});
      } else {
        api.emitNextCandles(); // for backtesting;
      }
    },

    async makeDesigion(pair: IPair, api: TradeAPI, trendData: {trend: TRADE_DIRECTIONS, price: number}) {
      const {price, trend} = trendData;
      const lastOrder = await api.getOrders(pair)
        .then((orders) => orders.find((order) => order && order.side === trend))
        .catch((error) => {
          loggerLog({
            level: "error",
            message: error.message,
            trace: error.trace,
            api: pair.apiName,
          });
        });
      if (lastOrder && lastOrder.time) {
        const parsedTime = parseTimeFromConfig(pair.candlesConfig.interval);
        const orderLifetime = Date.now() - Number(lastOrder.time);
        const timeGap =  convertTime(parsedTime.numericValue, parsedTime.timeUnit, TRANSFORM_MEASURES.MILLISECONDS) * 3;
        if (orderLifetime < timeGap) {
          api.emitNextCandles(); // for backtesting;
          return;
        }
      }

      loggerLog({
        level: "info",
        message: `current trend: ${trend}`,
        api: pair.apiName,
      });

      this.changeState("trade");
      this.dispatch(trend, pair, api, price);
      return;
    },
  },

  trade: {
    async sell(pair: IPair, api: TradeAPI, price: number) {
      try {
        const tradeLimit = await api.getMinLotSize(pair);
        const orderQuantity = await api.getOrderQuantity(pair.make, price, tradeLimit);

        if (!orderQuantity) {
          loggerLog({
            level: "info",
            message: `low balance for selling ${pair.make}`,
            api: pair.apiName,
          });
          return;
        }
        const transformQuantity = getConfigQuantityFormaters(pair);
        const order = await api.sell(pair, transformQuantity(orderQuantity), price);

        const balance = await api.getPairBalance(pair);
        loggerLog({
          balance,
          level: "info",
          message: "created sell order",
          order,
          api: pair.apiName,
        });
      } catch (error) {
        loggerLog({
          level: "error",
          error,
          api: pair.apiName,
        });
      }
      api.emitNextCandles(); // for backtesting;
    },
    async buy(pair: IPair, api: TradeAPI, price: number) {
      try {
        const tradeLimit = await api.getMinLotSize(pair);
        const transformQuantity = getConfigQuantityFormaters(pair);
        const order = await api.buy(pair, transformQuantity(tradeLimit / price), price);
        const balance = await api.getPairBalance(pair);

        loggerLog({
          balance,
          level: "info",
          message: "created buy order",
          order,
          api: pair.apiName,
        });
      } catch (error) {
        loggerLog({
          level: "error",
          error,
          api: pair.apiName,
        });
      }
      api.emitNextCandles(); // for backtesting;
    },
  },
};

export default stateMachine;
