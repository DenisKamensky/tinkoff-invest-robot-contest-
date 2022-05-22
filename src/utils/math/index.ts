export const isInRange = (arrayToSearch: number[], numberVal: number): boolean => {
  arrayToSearch.sort((a, b) => a - b);
  return (numberVal <= arrayToSearch[arrayToSearch.length - 1]) && (numberVal >= arrayToSearch[0]);
};
