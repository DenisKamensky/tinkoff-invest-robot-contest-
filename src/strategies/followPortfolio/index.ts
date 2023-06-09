import * as math from 'mathjs';
import {ITransition} from "../../utils/stateMachine";
import {IUserId} from "../../entities/user";
import TradeAPI from "../../tradeAPI/baseApi";
import IPair from "../../entities/pair";
import db from "../../db";
import IPortfolio, {IInstrument, IPosition, IRawPortfolio} from "../../entities/portfolio";

declare var logger;

const isMainPortfolioCurrency = (position: IPosition) => {
  return (position.instrument_type === IInstrument.CURRENCY) && (position.current_price === 1);
};

type IProportion = IPosition & {percent: number}
type IPortfolioProportion = Record<IPosition["figi"], IProportion>;
const calcPortfolioProportion = (portfolio: IPortfolio, totalPortfolioPrice: number): IPortfolioProportion => {
  const result = {} as IPortfolioProportion;
  portfolio.positions.forEach(position => {
    if (isMainPortfolioCurrency(position)) {
      return;
    }
    const {figi, quantity, current_price} = position;
    const rawPercent = math.chain(quantity)
      .multiply(current_price)
      .divide(totalPortfolioPrice)
      .done();
    result[figi] = {
      ...position,
      percent: rawPercent,
    };
  });
  return result;
}

const stateMachine: ITransition = {
    init: {
      async exec(pair: IPair, api: TradeAPI, userId: IUserId) {
        const currentPortfolio = await api.getPortfolio(pair.sourcePortfolioId).catch(e => {
          logger.log({
              level: "error",
              error: e,
              api: pair.apiName,
              strategy: 'followPortfolio',
          });
        });
        if (!currentPortfolio) {
          return;
        }
        this.changeState('analyzePortfolio');
        
        this.dispatch("detectChangesInPortfolio", pair, api, userId, currentPortfolio);
      },
    },
    analyzePortfolio: {
      async detectChangesInPortfolio(pair: IPair, api: TradeAPI, userId: IUserId, portfolio: IRawPortfolio) {
        // from time to time TINKOFF sends empty portfolio
        if (!portfolio.positions.length) {
          return;
        }
        let portfolioSnapshot;
        try {
          portfolioSnapshot = await db.getPortfolio(pair.sourcePortfolioId)
            .then(snapshot => snapshot || {id: pair.sourcePortfolioId, positions: []});
        } catch(e) {
          logger.log({
            level: "error",
            error: e,
            api: pair.apiName,
            strategy: 'followPortfolio',
          });
        }

        if (!portfolioSnapshot) {
          return;
        }

        // store snapshot in hashTable to reduce loop cycles
        const changedPositions: Record<IPosition['figi'], IPosition> = portfolioSnapshot.positions.reduce((acc, currentPosition) => {
          if (!isMainPortfolioCurrency(currentPosition)) {
            acc[currentPosition.figi] = currentPosition;
          }
          return acc;
        }, {});
        let commonPortfolioPrice = 0;
        portfolio.positions.forEach((position: IPosition) => {
          // save precision for computations
          commonPortfolioPrice = math.chain(position.current_price)
            .multiply(position.quantity)
            .add(commonPortfolioPrice)
            .done();
          if (isMainPortfolioCurrency(position)) {
            return;
          }
          const cachedPositon = changedPositions[position.figi]; 
          if (!cachedPositon) {
            changedPositions[position.figi] = position;
            return;
          }

          if (cachedPositon.quantity === position.quantity) {
            delete changedPositions[position.figi];
          }
        });
        if (!Object.keys(changedPositions).length) {
          return;
        }
        logger.log({
          level: "info",
          api: pair.apiName,
          strategy: 'followPortfolio',
          changedPositions,
          newPortfolio: portfolio,
          dbPortfolio: portfolioSnapshot,
        });
        await db.savePortfolio(pair.sourcePortfolioId, portfolio);
        this.dispatch("calculatePortfolioProportions", pair, api, userId, {portfolio, totalPortfolioPrice: commonPortfolioPrice});
      },
    
      async calculatePortfolioProportions(pair: IPair, api: TradeAPI, userId: IUserId, {portfolio, totalPortfolioPrice}: {portfolio: IPortfolio, totalPortfolioPrice: number}) {
        const sourcePortfolioProportions = calcPortfolioProportion(portfolio, totalPortfolioPrice);
        let targetPortfolio;
        try {
          targetPortfolio = await api.getPortfolio(pair.targetPortfolioId);
        } catch(e) {
          logger.log({
            level: "error",
            error: e,
            api: pair.apiName,
            strategy: 'followPortfolio',
          });
          return;
        }
        if (!targetPortfolio) {
          return;
        }

        const orders = {
          buy: [],
          sell: [],
        };
        //@TODO: fix to uneversal way of proccessing total balance (now it works only with Tinkoff API)
        const targetPortfolioAllSharesPrice = parseFloat(targetPortfolio.total_amount_shares);
        const targetPortfolioAllBondsPrice = parseFloat(targetPortfolio.total_amount_bonds);
        const targetPortfolioAllEtfsPrice = parseFloat(targetPortfolio.total_amount_etf);
        const targetPortfolioAllCurrenciesPrice = parseFloat(targetPortfolio.total_amount_currencies);
        const targetPortfolioAllFuturesPrice = parseFloat(targetPortfolio.total_amount_futures);
        const targetPortfolioTotalPrice = Number(math.chain(targetPortfolioAllSharesPrice)
          .add(targetPortfolioAllBondsPrice)
          .add(targetPortfolioAllCurrenciesPrice)
          .add(targetPortfolioAllEtfsPrice)
          .add(targetPortfolioAllFuturesPrice)
          .done()
          .toFixed(2)
        );

        const targetPortfolioProportions = calcPortfolioProportion(targetPortfolio, targetPortfolioTotalPrice);

        const calculateQuantityLotsFromPercent = (percent: number, item: IProportion, portfolioPrice: number) => {
          const {quantity, quantity_lots, current_price} = item;
          const moneyFromPercent = math.chain(percent).multiply(portfolioPrice).done();
          const itemsInLot = math.chain(quantity).divide(quantity_lots).done();
          const priceForLot = math.chain(itemsInLot).multiply(current_price).done();
          const lotsToTrade = math.chain(moneyFromPercent).divide(priceForLot).round().done();
          return {
            quantity_lots: lotsToTrade,
            quantity: math.chain(lotsToTrade).multiply(itemsInLot).done(),
          };
        };

        // define new Portfolio
        Object.keys(sourcePortfolioProportions).forEach(key => {
          const sourcePortfolioItem = sourcePortfolioProportions[key];
          const targetPortfolioItem = targetPortfolioProportions[key] || {quantity_lots: 0, percent: 0} as IProportion;
          // need to buy some cuz we have less percent in tartgetPortfolio
          if (sourcePortfolioItem.percent > targetPortfolioItem.percent) {
            const {quantity, quantity_lots} = calculateQuantityLotsFromPercent(
              math.chain(sourcePortfolioItem.percent).subtract(targetPortfolioItem.percent).done(),
              sourcePortfolioItem,
              targetPortfolioTotalPrice,
            );
            if (quantity_lots) {
              orders.buy.push({
                ...sourcePortfolioItem,
                quantity_lots,
                quantity,
              });
            }

          // need to sell some cuz we have more percent in targetPortfolio
          } else if (sourcePortfolioItem.percent < targetPortfolioItem.percent) {
            const {quantity, quantity_lots} = calculateQuantityLotsFromPercent(
              math.chain(targetPortfolioItem.percent).subtract(sourcePortfolioItem.percent).done(),
              sourcePortfolioItem,
              targetPortfolioTotalPrice,
            );
            if (quantity_lots) {
              orders.sell.push({
                ...sourcePortfolioItem,
                quantity_lots,
                quantity,
              });
            }
          }

          delete targetPortfolioProportions[key];
        });

        Object.keys(targetPortfolioProportions).forEach(key => {
          const item = targetPortfolioProportions[key];
          if (!item) {
            return;
          }
          orders.sell.push(item);
        });

        if (orders.buy.length || orders.sell.length) {
          this.changeState('trade');
          this.dispatch('fulfillTrades', pair, api, userId, orders);
        } 
      }
    },
    trade: {
      fulfillTrades(pair: IPair, api: TradeAPI, userId: IUserId, orders: {buy: IProportion[], sell: IProportion[]}) {
        const mapFn = (apiTradeFn: Function) => {
          return async ({quantity_lots, figi}) => (
            apiTradeFn(pair, quantity_lots, undefined, figi, pair.targetPortfolioId)
              .catch(e => logger.log({
                level: "error",
                error: e,
                api: pair.apiName,
                strategy: 'followPortfolio',
                message: JSON.stringify({quantity_lots, figi}),
            })
            .then(order => {
              logger.log({
                message: JSON.stringify(order, null, 2),
                api: pair.apiName,
                strategy: 'followPortfolio', 
                level: 'info',
              })
              return order;
            })
          ))
        };
        Promise.all(
          orders
          .sell
          .map(mapFn(api.sell.bind(api)))
        ).then(soldOrders => {
          return Promise.all(
            orders
              .buy
              .map(mapFn(api.buy.bind(api)))
          )
        }).then(purchasedOrders => {
          logger.log({
            level: "info",
            message: `target portfolio ${pair.targetPortfolioId} is rebalanced`,
            api: pair.apiName,
            strategy: 'followPortfolio',
          })
        })
      },
    }
};

export default stateMachine;
