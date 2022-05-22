import TRADE_DIRECTIONS from "./tradeDirections";

interface ICandle {
  closeTime?: number;
  closingPrice: number;
  higherPrice: number;
  lowerPrice: number;
  openningPrice: number;
  openningTime?: number;
  volume: number;
  tradeSide?: TRADE_DIRECTIONS
}

export default ICandle;
