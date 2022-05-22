import {TRANSFORM_MEASURES} from "../timeConverter";

enum measurmentDictionary {
  "m" = TRANSFORM_MEASURES.MINUTES,
  "h" = TRANSFORM_MEASURES.HOURS,
  "d" = TRANSFORM_MEASURES.DAYS,
}

export type ITimeConfParserResult = {
  numericValue: number,
  timeUnit: TRANSFORM_MEASURES,
}
export default (time: string): ITimeConfParserResult => {
  const [_, numericValue, timeUnit] = time.match(/(\d{1,})([a-z]{1,})/);

  return {
    numericValue: Number(numericValue),
    timeUnit: measurmentDictionary[timeUnit],
  };
};
