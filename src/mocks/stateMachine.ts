export default {
  changedState: {
    foo() { return undefined; },
    bar() { return undefined; },
  },
  init: {
    exec(...args) {
      this.changeState("changedState");
    },
  },
};
