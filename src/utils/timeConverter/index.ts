/**
 * Enum for convertation meausers.
 * convert only integer values
 */
export enum TRANSFORM_MEASURES {
  MILLISECONDS = 0,
  SECONDS = 1,
  MINUTES = 2,
  HOURS = 3,
  DAYS = 4,
  WEEKS = 5,
}

export const convert = (time: number, from: TRANSFORM_MEASURES, to: TRANSFORM_MEASURES): number => {
  const convertationValues: number[] = [1, 1000, 60, 60, 24, 7];
  const generateOutOfRangeErr = (param) =>
    new Error(`"${param}" parameter is out of converting range`);

  if (!convertationValues[from]) {
    throw generateOutOfRangeErr("from");
  }
  if (!convertationValues[to]) {
    throw generateOutOfRangeErr("to");
  }

  const isIncreasingTRANSFORM = from < to;
  let result = Number(time.toFixed(2));
  if (isIncreasingTRANSFORM) {
    while (from < to) {
      result /= convertationValues[from + 1];
      from++;
    }
  } else {
    while (from > to) {
        result *= convertationValues[from];
        from--;
      }
  }
  return result;
};
