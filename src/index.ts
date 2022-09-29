import * as dotenv from "dotenv";
import * as fs from "fs";
import path from "path";
import {promisify} from "util";
import * as winston from "winston";

import IPair from "./entities/pair";
import ITradeConfigItem from "./entities/tradeConfig";
import {convertTime, TRANSFORM_MEASURES} from "./utils";

import TradeAPIs from "./entities/tradeAPIs";
import AlpacaAPI from "./tradeAPI/alpaca";
import TradeAPI from "./tradeAPI/baseApi";
import BinanceApi from "./tradeAPI/binance";
import TinkoffApi from "./tradeAPI/tinkoff";
import StateMachine from "./utils/stateMachine";

dotenv.config();

import trendDrivenStrategy from "./strategies/DCA";

const logger = winston.createLogger({
  defaultMeta: {},
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
  ),
  level: "info",
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: "combined.log", maxsize: 1e+8}), // 100mb
  ],
});

if (process.env.NODE_ENV === "development") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
// tslint:disable-next-line:no-string-literal
global["logger"] = logger;

const apis: {[key: string]: TradeAPI} = {
  [TradeAPIs.ALPACA]: new AlpacaAPI(),
  [TradeAPIs.BINANCE]: new BinanceApi(),
  [TradeAPIs.TINKOFF]: new TinkoffApi(),
};

const readFile = promisify(fs.readFile);
const configFileName = "trade-config.json";
const PATH_TO_CONFIG = path.resolve(configFileName);
const initialConfig = JSON.parse(fs.readFileSync(PATH_TO_CONFIG, "utf-8"));
let tradeConfig = initialConfig as ITradeConfigItem[];

/*
* update config on Changes
*/
fs.watch(path.resolve(), (eventType, filename) => {
  if (filename !== configFileName || eventType !== "change") {
    return;
  }
  readFile(PATH_TO_CONFIG, "utf-8")
    .then((content) => {
      tradeConfig = JSON.parse(content);

    });
});

setInterval(() => {
  tradeConfig.forEach((user) => {
    const userAPIS = Object.keys(user.APIs)
      .reduce((apiList, currentApiName) => {
        const api = apis[currentApiName];
        if (!api) {
          logger.log({
            level: "error",
            message: `${user.id} ${currentApiName} - api not found`,
          });
          return apiList;
        }
        const config = user.APIs[currentApiName];
        api.setConfig(config);
        apiList[currentApiName] = api;
        return apiList;
      }, {});
    user.pairs.forEach((pair: IPair) => {
      const api = userAPIS[pair.apiName];
      if (!api) {
        logger.log({
          level: "error",
          message: `${pair.apiName} - api not found`,
        });
        return;
      }
      const machine = new StateMachine(trendDrivenStrategy, "init");
      machine.dispatch("exec", pair, api, user.id);
    });
  });
}, convertTime(1, TRANSFORM_MEASURES.HOURS, TRANSFORM_MEASURES.MILLISECONDS));
