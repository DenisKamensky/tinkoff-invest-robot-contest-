const dataForge = require('data-forge');
const { backtest, analyze } = require('grademark');
import fs from "fs";
import {promisify} from "util";
import path from "path";
import * as dotenv from "dotenv";
import ICandle from "./entities/candle";
import TinkoffApi from "./tradeAPI/tinkoff";
import BacktestApi, {API_EVENTS} from "./tradeAPI/backtestApi";
import StateMachine from "./utils/stateMachine";
import trendDrivenStrategy from "./strategies/bollindgerBands";
import TradeAPIs from "./entities/tradeAPIs";
import TRADE_DIRECTIONS from "./entities/tradeDirections";


dotenv.config();

// tslint:disable-next-line:no-string-literal
global["logger"] = console;
declare var logger;

const SAVE_TO_FILE = null; // report

const STARTING_CAPITAL_IN_RUB = 10000;


const readFile = promisify(fs.readFile);
const mapCandlesFn = (candle: ICandle) => ({
    time: candle.openningTime,
    open: candle.openningPrice,
    high: candle.higherPrice,
    low: candle.lowerPrice,
    close: candle.closingPrice,
    tradeSide: candle.tradeSide,
})

/*
can be a json config like {ticker: 'TCS', interval: '1d', to: '2022-01-01T00:14:18.113Z', from: '2018-05-22T00:14:18.113Z'}
or string contains path to json file like path.resolve('report.json')
*/
const LOAD_DATA_FROM = {ticker: 'TCS', interval: '1d', to: '2022-01-01T00:14:18.113Z', from: '2018-05-22T00:14:18.113Z'}; 

const loadCandlesData = async () => {
    let historicalData;
    if (typeof LOAD_DATA_FROM === 'string') {
        // @TODO: load from file
        const rawData = await readFile(LOAD_DATA_FROM, 'utf-8');
        historicalData = { 
            candles: JSON.parse(rawData),
            pair: {
                apiName: TradeAPIs.BACKTEST,
                make: 'INSERT_TICKER (OPTOPNAL)',
                take: 'RUB',
                candlesConfig: {
                    interval: '1d', // insert candles interval 1m | 5m | 15m | 1h | 1d
                    limit: 20, // default candles quantity for request
                }
            }
        };
    } else {
        const loaderConfig = LOAD_DATA_FROM as any;
        const api = new TinkoffApi();
        api.setConfig({
            key: process.env.TINKOFF_TOKEN,
            account_id: process.env.TINKOFF_ACCOUNT_ID,
            isSandBox: true,
        });
        historicalData = await api.loadHistoricalCandles(loaderConfig)
            .then(candles => ({
                candles,
                pair: {
                    apiName: TradeAPIs.BACKTEST,
                    make: loaderConfig.ticker,
                    take: 'RUB',
                    candlesConfig: {
                        interval: loaderConfig.interval, // insert candles interval 1m | 5m | 15m | 1h | 1d
                        limit: 20, // default candles quantity for request
                    }
                }
            }));
    }
    return historicalData;
}


const runBackTest = (dataSet) => {
    const strategy = {
        entryRule: (enterPosition, args) => {
            
            if (args.bar.tradeSide === TRADE_DIRECTIONS.BUY) { // Buy when price is below average.
                enterPosition({ direction: "long" }); // Long is default, pass in "short" to short sell.
            }
        },
    
        exitRule: (exitPosition, args) => {
            if (args.bar.tradeSide === TRADE_DIRECTIONS.SELL) {
                exitPosition(); // Sell when price is above average.
            }
        },
    
        stopLoss: args => { // Optional intrabar stop loss.
        },
    };

    const trades = backtest(strategy, dataSet);
    console.log("Made " + trades.length + " trades!");
    const analysis = analyze(STARTING_CAPITAL_IN_RUB, trades);
    console.log(analysis);
}

if (!SAVE_TO_FILE) {
    loadCandlesData().then(({candles, pair}) => {
        const backtestApi = new BacktestApi();
        backtestApi.setConfig({candlesCache: candles});
        const processStrategy = () => {
            const machine = new StateMachine(trendDrivenStrategy, "init");
            machine.dispatch("exec", pair, backtestApi, 0);
        };
        backtestApi.subscribeOn(API_EVENTS.LOAD_NEXT_CHUNK, () => {
            processStrategy();
        });
    
        processStrategy();
    
    
        backtestApi.subscribeOn(API_EVENTS.ALL_CANDLES_LOADED, () => {
            console.log('loaded')
            let candles = backtestApi.getCandleResults();
            candles = candles.map(mapCandlesFn);
            const dataSet = new dataForge.DataFrame(candles);
            runBackTest(dataSet);
        });
    });
} else {
    const filePath = `${path.resolve(SAVE_TO_FILE)}.json`
    loadCandlesData().then(({candles}) => {
        fs.writeFile(filePath, JSON.stringify(candles), () => {
            logger.log(`${filePath} saved`)
        })
    })
}

