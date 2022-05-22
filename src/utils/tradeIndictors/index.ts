import * as math from "mathjs";
import TRADE_DIRECTIONS from "../../entities/tradeDirections";

const TO_FIXED_VALUE: number = 7;

const transformNumberToFixed = (
  numberValue: number,
  toFixedValue = TO_FIXED_VALUE,
  ): number =>
  Number((numberValue).toFixed(toFixedValue));

export const getMovingAverage = (candleClosingPrices: number[]): number => {
  const totalPrice = candleClosingPrices.reduce((total, current) => {
    return transformNumberToFixed(total + current);
  }, 0);
  return transformNumberToFixed(totalPrice / candleClosingPrices.length);
};

export const getStandartDeviation = (candleClosingPrices: number[]): number =>
  math.std(candleClosingPrices, "biased");

interface IGetCandleDirection {
  openningPrice: number;
  closingPrice: number;
}

export const getCandleDirection = (
  {openningPrice, closingPrice}: IGetCandleDirection,
): TRADE_DIRECTIONS =>
(openningPrice >= closingPrice
  ? TRADE_DIRECTIONS.BUY
  : TRADE_DIRECTIONS.SELL
);
