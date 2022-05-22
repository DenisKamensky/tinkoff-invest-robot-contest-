import {expect} from "chai";
import pairMock from "../../mocks/pair";
import getConfigFormater from "./";

describe("getConfigQuantityFormaters", () => {
  it("should return empty callback", () => {
    const mock = Object.assign({}, pairMock);
    delete mock.quantityFormater;
    const resultFn = getConfigFormater(mock);
    expect(resultFn(1)).to.be.equal(1);
  });

  it("should return callback from config", () => {
    expect(getConfigFormater(pairMock)(1)).to.be.equal(2);
  });
});
