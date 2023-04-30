import { IStrategyNames } from "./strategyNames";
import TradeAPIs from "./tradeAPIs";

interface ICryptoPair {
  candlesConfig?: {
    interval: string, // interval of a candle
    limit?: number, // how many candles to get
    from?: string, // ISO date
    to?: string, // ISO date
  };
  take?: string; // initial currency | ticker
  make?: string; // target currency | ticker
  makeType?: string; // type of instrument (required for tinkoff api)
  quantityFormater?: string;
  minLotQuantity?: number; // how many min lots to trade
  // tslint:disable-next-line:max-line-length
  offset?: number; // allows to tune sensetivity of std edges intersection, calue in percents from total coridor height
}

interface IFollowPortfolioPair {
  sourcePortfolioId?: string;
  targetPortfolioId?: string;
};

interface ICommonPair {
  apiName: TradeAPIs;
  strategyName: IStrategyNames;
  execTime: string; // scheduling time in cron syntax
}

type IPair = ICommonPair & IFollowPortfolioPair & ICryptoPair;


export default IPair;
