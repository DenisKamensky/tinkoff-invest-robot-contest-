import IPair from "../entities/pair";
import { IStrategyNames } from "../entities/strategyNames";
import TradeAPIs from "../entities/tradeAPIs";

const pair: IPair =  {
  apiName: TradeAPIs.BINANCE,
  candlesConfig: {
    interval: "15",
    limit: 20,
  },
  strategyName: IStrategyNames.DCA,
  offset: 10,
  make: "RUB",
  minLotQuantity: 2,
  quantityFormater: "(val) => val * 2",
  take: "BNB",
  execTime: "* * * * * *",
};

export default pair;
