import TradeAPIs from "./tradeAPIs";

interface IPair {
  apiName: TradeAPIs;
  candlesConfig: {
    interval: string, // interval of a candle
    limit?: number, // how many candles to get
    from?: string, // ISO date
    to?: string, // ISO date
  };
  take: string; // initial currency | ticker
  make: string; // target currency | ticker
  makeType?: string; // type of instrument (required for tinkoff api)
  quantityFormater?: string;
  minLotQuantity?: number; // how many min lots to trade
  // tslint:disable-next-line:max-line-length
  offset?: number; // allows to tune sensetivity of std edges intersection, calue in percents from total coridor height
}

export default IPair;
