
import {get} from "underscore";

declare var logger;
export interface ITransition {
  [key: string]: {
    [key: string]: (...args: any[]) => any,
  };
}

class StateMachine {
  private state: string;
  private transitions: ITransition;

  constructor(states: ITransition, currentState: string) {
    this.state = currentState;
    this.transitions = states;
  }

  public async dispatch(methodName: string, ...payload: any[]) {
    const method: () => {} = get(this.transitions, [this.state, methodName]);
    if (!method) {
      logger.log({
        level: "error",
        message: "method not found",
      });
      return;
    }
    method.apply(this, payload);
  }

  public changeState(newState: string) {
    this.state = newState;
  }
}

export default StateMachine;
