import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs";
import path from "path";
import * as winston from "winston";
import {CronJob} from "cron";

import ITradeConfigItem from "./entities/tradeConfig";
import TradeAPIs from "./entities/tradeAPIs";
import AlpacaAPI from "./tradeAPI/alpaca";
import TradeAPI from "./tradeAPI/baseApi";
import BinanceApi from "./tradeAPI/binance";
import TinkoffApi from "./tradeAPI/tinkoff";
import StateMachine, { ITransition } from "./utils/stateMachine";
import DcaStrategy from "./strategies/DCA";
import FollowPortfolioStrategy from "./strategies/followPortfolio";
import { IStrategyNames } from "./entities/strategyNames";
import IPair from "./entities/pair";


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

const configFileName = "trade-config.json";
const PATH_TO_CONFIG = path.resolve(configFileName);
const initialConfig = JSON.parse(fs.readFileSync(PATH_TO_CONFIG, "utf-8"));
let tradeConfig = initialConfig as ITradeConfigItem[];

const strategiesDictionary: Record<IStrategyNames, ITransition> = {
  [IStrategyNames.DCA]: DcaStrategy,
  [IStrategyNames.FOLLOW_PORTFOLIO]: FollowPortfolioStrategy,
};
const tasks = [];

tradeConfig.forEach(user => {
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
        const strategy = strategiesDictionary[pair.strategyName];
        if (!strategy) {
          logger.log({
            level: "error",
            message: `${pair.strategyName} - strategy not found`,
          });
          return;
        }
        if (!pair.execTime) {
          logger.log({
            level: "error",
            message: `${JSON.stringify(pair, null, 2)} - exec time is not valid`,
          })
          return;
        }

        const job = new CronJob(
          pair.execTime,
          () => {
            const machine = new StateMachine(strategy, "init");
            machine.dispatch("exec", pair, api, user.id);
          }
        );

        tasks.push(job);
      });
});

tasks.forEach(task => task.start());
