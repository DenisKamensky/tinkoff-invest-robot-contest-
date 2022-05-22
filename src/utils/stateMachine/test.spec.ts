import {expect} from "chai";
import sinon from "sinon";
import StateMachine from ".";
import stateMachineMock from "../../mocks/stateMachine";

declare var logger;
describe("StateMachine", () => {
  let stateMachine;
  beforeEach(() => {
    stateMachine = new StateMachine(stateMachineMock, "init");
  });

  it("should change state", () => {
    expect(stateMachine.state).to.be.equal("init");
    stateMachine.dispatch("exec", 1, 2);
    expect(stateMachine.state).to.be.equal("changedState");
  });

  it("should dispatch method", () => {
    expect(stateMachine.state).to.be.equal("init");
    const spyFn = sinon.spy(stateMachine.transitions.init, "exec");
    stateMachine.dispatch("exec", 1, 2);
    // tslint:disable-next-line:no-unused-expression
    expect(spyFn.calledWith(1, 2)).to.be.true;
  });

});
