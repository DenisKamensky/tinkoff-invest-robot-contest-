import {expect} from "chai";
import {TRANSFORM_MEASURES} from "../timeConverter";
import converter from "./";

describe("ParseTimefromConfig", () => {
  it("should parse time string to minutes", () => {
    const result = {
      numericValue: 30,
      timeUnit: TRANSFORM_MEASURES.MINUTES,
    };
    expect(converter("30m")).to.deep.equal(result);
  });

  it("should parse time string to hours", () => {
    const result = {
      numericValue: 1,
      timeUnit: TRANSFORM_MEASURES.HOURS,
    };
    expect(converter("1h")).to.deep.equal(result);
  });

  it("should parse time string to days", () => {
    const result = {
      numericValue: 1,
      timeUnit: TRANSFORM_MEASURES.DAYS,
    };
    expect(converter("1d")).to.deep.equal(result);
  });
});
