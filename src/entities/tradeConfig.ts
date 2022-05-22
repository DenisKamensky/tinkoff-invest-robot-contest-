import Ipair from "./pair";
import TradeAPIs from "./tradeAPIs";
import {IUserId} from "./user";

interface ITradeConfigItem {
  id: IUserId;
  APIs: {
    [key in TradeAPIs]: {
      [key: string]: any,
    };
  };
  pairs: Ipair[];
}

export default ITradeConfigItem;
