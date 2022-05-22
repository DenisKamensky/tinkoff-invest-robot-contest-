import getConfigQuantityFormaters from "./getConfigQuantityFormaters";
import parseTimeFromConfig, {ITimeConfParserResult} from "./parseTimeFromConfig";
import {convert as convertTime, TRANSFORM_MEASURES } from "./timeConverter";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export {
  TRANSFORM_MEASURES,
  convertTime,
  getConfigQuantityFormaters,
  parseTimeFromConfig,
  ITimeConfParserResult,
  delay,
};
