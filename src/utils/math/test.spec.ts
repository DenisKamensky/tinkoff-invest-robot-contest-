import {isInRange} from './';
import {expect} from 'chai';


describe('Math', () => {
  it('should return that number is in range', () => {
    const arrayToSearch = [1, 50];
    expect(isInRange(arrayToSearch, 50)).to.be.true;
    expect(isInRange(arrayToSearch, 1)).to.be.true;
  });

  it('should return that number is not in range', () => {
    const arrayToSearch = [1, 50];
    expect(isInRange(arrayToSearch, 51)).to.be.false;
    expect(isInRange(arrayToSearch, 0)).to.be.false;
  });
});
