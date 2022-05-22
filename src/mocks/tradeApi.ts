import IPair from "../entities/pair";
import BaseAPI from "../tradeAPI/baseApi";

class StubTradeApi extends BaseAPI {

  public getCandleStick(pair: IPair) {
    return Promise.resolve([]);
  }

  public getOrders(pair: IPair, params?: any) {
    return Promise.resolve([]);
  }

  public getMinLotSize(pair: IPair) {
    return Promise.resolve(0);
  }

  public getOrderQuantity(ticker: string, price: number, limit: number) {
    return Promise.resolve(0);
  }

  public sell(pair: IPair, orderQuantity: number, price: number) {
    return Promise.resolve();
  }

  public buy(pair: IPair, orderQuantity: number, price: number) {
    return Promise.resolve();
  }

  public getPairBalance(pair: IPair) {
    return Promise.resolve();
  }

  protected createAuthHeader() {
    return { foo: ""};
  }

  protected detectFetchError(data) {
    return null;
  }
}

export default StubTradeApi;
