import IPair from "../entities/pair";
import TradeAPIs from "../entities/tradeAPIs";

const pair: IPair =  {
  apiName: TradeAPIs.BINANCE,
  candlesConfig: {
    interval: "15",
    limit: 20,
  },
  offset: 10,
  make: "RUB",
  minLotQuantity: 2,
  quantityFormater: "(val) => val * 2",
  take: "BNB",
};

export default pair;
