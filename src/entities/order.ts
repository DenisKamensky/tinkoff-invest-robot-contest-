import TRADE_DIRECTIONS from "./tradeDirections";

interface IOrder {
  time: string | number;
  side: TRADE_DIRECTIONS;
  price?: string | number;
  [key: string]: string | number | any[];
}

export default IOrder;
