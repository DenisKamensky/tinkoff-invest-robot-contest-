import {expect} from "chai";
import sinon from "sinon";
import bollingerBandsStrategy from ".";
import TRADE_DIRECTIONS from "../../entities/tradeDirections";
import candleMock, {
  withBottomIntersectionMock,
  withCloseToBottomEdgeMock,
  withCloseToTopEdgeMock,
  withoutOrderMock,
  withTopIntersectionMock,
} from "../../mocks/candle";
import pairMock from "../../mocks/pair";
import StubTradeApi from "../../mocks/tradeApi";
import StateMachine from "../../utils/stateMachine";

describe("BollindgerBandsStrategy", () => {
    let strategy;
    let tradeAPI;
    // tslint:disable-next-line:no-string-literal
    global["logger"] = console;
    beforeEach(() => {
        strategy = new StateMachine(bollingerBandsStrategy, "init");
        tradeAPI = new StubTradeApi();
    });

    afterEach(() => {
      sinon.restore();
      strategy = null;
      tradeAPI = null;
    });

    it("should create strategy", () => {
        // tslint:disable-next-line:no-unused-expression
        expect(strategy).not.be.empty;
        expect(strategy).to.have.property("dispatch");
        expect(strategy).to.have.property("changeState");
    });

    it("should call getCandleStick method", () => {
      const spyFn = sinon.spy(strategy.transitions.init, "getCandleStick");
      const pairClone = Object.assign({}, pairMock);
      strategy.dispatch("exec", pairClone, tradeAPI);
      // tslint:disable-next-line:no-unused-expression
      expect(spyFn.called).to.be.true;
      spyFn.restore();
    });

    it("shouldn't change state if there's no candeles", () => {
      strategy.dispatch("getCandleStick", {}, {
        getCandleStick() {
          return [];
        },
      });
      expect(strategy.state).to.be.equal("init");
    });

    it("should change state after getting candles", (done) => {
      sinon.replace(
        tradeAPI,
        "getCandleStick",
        sinon.fake.returns(
        [candleMock],
      ));
      strategy.dispatch("getCandleStick", pairMock, tradeAPI).then(() => {
        expect(strategy.state).to.be.equal("analyze");
        done();
      });
    });

    it("shouldn't detect trend if there's no intersections", () => {
        strategy.changeState("analyze");
        const spyFn = sinon.spy(strategy.transitions.analyze, "makeDesigion");
        strategy.dispatch(
          "detectTrend",
          pairMock,
          tradeAPI,
          withoutOrderMock,
        );
        expect(strategy.state).to.be.equal("analyze");
        // tslint:disable-next-line:no-unused-expression
        expect(spyFn.called).to.be.false;
        spyFn.restore();
    });

    it("should call make desigion if candle intersects bottom edge std", () => {
      const spyFn = sinon.spy(strategy.transitions.analyze, "makeDesigion");
      strategy.changeState("analyze");
      strategy.dispatch(
        "detectTrend",
        pairMock,
        tradeAPI,
        withBottomIntersectionMock,
      );
      expect(strategy.state).to.be.equal("analyze");
      // tslint:disable-next-line:no-unused-expression
      expect(spyFn.called).to.be.true;
      expect(spyFn.getCall(0).args[2].trend).to.be.equal(TRADE_DIRECTIONS.BUY);
      spyFn.restore();
    });

    it("should call make desigion if candle intersects top edge std", () => {
      const spyFn = sinon.spy(strategy.transitions.analyze, "makeDesigion");
      strategy.changeState("analyze");
      strategy.dispatch(
        "detectTrend",
        pairMock,
        tradeAPI,
        withTopIntersectionMock,
      );
      expect(strategy.state).to.be.equal("analyze");
      // tslint:disable-next-line:no-unused-expression
      expect(spyFn.called).to.be.true;
      expect(spyFn.getCall(0).args[2].trend).to.be.equal(TRADE_DIRECTIONS.SELL);
      spyFn.restore();
    });

    it("should call make desigion if candle close to bottom edge std", () => {
      const spyFn = sinon.spy(strategy.transitions.analyze, "makeDesigion");
      strategy.changeState("analyze");
      strategy.dispatch(
        "detectTrend",
        pairMock,
        tradeAPI,
        withCloseToBottomEdgeMock,
      );
      expect(strategy.state).to.be.equal("analyze");
      // tslint:disable-next-line:no-unused-expression
      expect(spyFn.called).to.be.true;
      expect(spyFn.getCall(0).args[2].trend).to.be.equal(TRADE_DIRECTIONS.BUY);
      spyFn.restore();
    });

    it("should call make desigion if candle close to top edge std", () => {
      const spyFn = sinon.spy(strategy.transitions.analyze, "makeDesigion");
      strategy.changeState("analyze");
      strategy.dispatch(
        "detectTrend",
        pairMock,
        tradeAPI,
        withCloseToTopEdgeMock,
      );
      expect(strategy.state).to.be.equal("analyze");
      // tslint:disable-next-line:no-unused-expression
      expect(spyFn.called).to.be.true;
      expect(spyFn.getCall(0).args[2].trend).to.be.equal(TRADE_DIRECTIONS.SELL);
      spyFn.restore();
    });

    it("shouldn't make trade if last order is too fresh", (done) => {
      const time = Date.now();
      sinon.replace(
        tradeAPI,
        "getOrders",
        sinon.fake.returns(
          Promise.resolve([{
            side: TRADE_DIRECTIONS.SELL,
            time: time - 200,
          }]),
        ),
      );
      strategy.changeState("analyze");
      strategy.dispatch(
        "makeDesigion",
        pairMock,
        tradeAPI,
        {price: 12, trend: TRADE_DIRECTIONS.SELL},
      ).then(() => {
        expect(strategy.state).to.be.equal("analyze");
        done();
      });
    });
});
