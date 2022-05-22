import {expect} from "chai";
import TRADE_DIRECTIONS from "../../entities/tradeDirections";
import {
  getCandleDirection,
  getMovingAverage,
  getStandartDeviation,
} from "./";

const mockPrices = [1, 2, 3, 4, 5];
describe("TradeIndicators", () => {
  it("should return correct moving average", () => {
    expect(getMovingAverage(mockPrices)).to.be.equal(3);
  });

  it("should return correct standart devition value", () => {
    expect(getStandartDeviation(mockPrices)).to.be.equal(1.2909944487358056);
  });

  it("should return correct candleDirection", () => {
    expect(
      getCandleDirection({ openningPrice: 1, closingPrice: 5}),
    ).to.be.equal(TRADE_DIRECTIONS.SELL);
    expect(
      getCandleDirection({ openningPrice: 3, closingPrice: 2}),
    ).to.be.equal(TRADE_DIRECTIONS.BUY);
  });
});
