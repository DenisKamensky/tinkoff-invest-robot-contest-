import TRADE_DIRECTIONS from "./tradeDirections";

interface IOrder {
  time: string | number;
  side: TRADE_DIRECTIONS;
}

export default IOrder;
