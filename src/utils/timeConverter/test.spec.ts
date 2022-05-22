import {expect} from 'chai';
import {convert, TRANSFORM_MEASURES} from './';

describe('Time converter', () => {
  it('should throw errors validation', () => {
    expect(
      () => convert(20, undefined, TRANSFORM_MEASURES.DAYS)
    ).to.throw(`"from" parameter is out of converting range`);
    expect(
      () => convert(20, TRANSFORM_MEASURES.DAYS, undefined)
    ).to.throw(`"to" parameter is out of converting range`);
  });

  describe('from milliseconds', () => {
    const from = TRANSFORM_MEASURES.MILLISECONDS;
    let to;

    it('should convert to seconds', () => {
      to = TRANSFORM_MEASURES.SECONDS;
      expect(convert(1000, from, to)).to.be.equal(1);
      expect(convert(10000, from, to)).to.be.equal(10);
      expect(convert(100000, from, to)).to.be.equal(100);
    });

    it('should convert to minutes', () => {
      to = TRANSFORM_MEASURES.MINUTES;
      expect(convert(60000, from, to)).to.be.equal(1);
      expect(convert(120000, from, to)).to.be.equal(2);
      expect(convert(90000, from, to)).to.be.equal(1.5);
      expect(convert(600000, from, to)).to.be.equal(10);
    });

    it('should convert to hours', () => {
      to = TRANSFORM_MEASURES.HOURS;
      expect(convert(3600000, from, to)).to.be.equal(1);
      expect(convert(1800000, from, to)).to.be.equal(0.5);
      expect(convert(7200000, from, to)).to.be.equal(2);
      expect(convert(36000000, from, to)).to.be.equal(10);
    });

    it('should convert to days', () => {
      to = TRANSFORM_MEASURES.DAYS;
      expect(convert(86400000, from, to)).to.be.equal(1);
      expect(convert(43200000, from, to)).to.be.equal(0.5);
      expect(convert(172800000, from, to)).to.be.equal(2);
      expect(convert(864000000, from, to)).to.be.equal(10);
    });

    it('should convert to weeks', () => {
      to = TRANSFORM_MEASURES.WEEKS;
      expect(convert(604800000, from, to)).to.be.equal(1);
      expect(convert(302400000, from, to)).to.be.equal(0.5);
      expect(convert(1209600000, from, to)).to.be.equal(2);
      expect(convert(6048000000, from, to)).to.be.equal(10);
    });
  });

  describe('from seconds', () => {
    const from = TRANSFORM_MEASURES.SECONDS;
    let to;

    it('should convert to milliseconds', () => {
      to = TRANSFORM_MEASURES.MILLISECONDS;
      expect(convert(1, from, to)).to.be.equal(1000);
      expect(convert(10, from, to)).to.be.equal(10000);
      expect(convert(100, from, to)).to.be.equal(100000);
    });

    it('should convert to minutes', () => {
      to = TRANSFORM_MEASURES.MINUTES;
      expect(convert(60, from, to)).to.be.equal(1);
      expect(convert(120, from, to)).to.be.equal(2);
      expect(convert(90, from, to)).to.be.equal(1.5);
      expect(convert(600, from, to)).to.be.equal(10);
    });

    it('should convert to hours', () => {
      to = TRANSFORM_MEASURES.HOURS;
      expect(convert(3600, from, to)).to.be.equal(1);
      expect(convert(1800, from, to)).to.be.equal(0.5);
      expect(convert(7200, from, to)).to.be.equal(2);
      expect(convert(36000, from, to)).to.be.equal(10);
    });

    it('should convert to days', () => {
      to = TRANSFORM_MEASURES.DAYS;
      expect(convert(86400, from, to)).to.be.equal(1);
      expect(convert(43200, from, to)).to.be.equal(0.5);
      expect(convert(172800, from, to)).to.be.equal(2);
      expect(convert(864000, from, to)).to.be.equal(10);
    });

    it('should convert to weeks', () => {
      to = TRANSFORM_MEASURES.WEEKS;
      expect(convert(604800, from, to)).to.be.equal(1);
      expect(convert(302400, from, to)).to.be.equal(0.5);
      expect(convert(1209600, from, to)).to.be.equal(2);
      expect(convert(6048000, from, to)).to.be.equal(10);
    });
  });

  describe('from minutes', () => {
    const from = TRANSFORM_MEASURES.MINUTES;
    let to;

    it('should convert to milliseconds', () => {
      to = TRANSFORM_MEASURES.MILLISECONDS;
      expect(convert(1, from, to)).to.be.equal(60000);
      expect(convert(10, from, to)).to.be.equal(600000);
      expect(convert(100, from, to)).to.be.equal(6000000);
    });

    it('should convert to seconds', () => {
      to = TRANSFORM_MEASURES.SECONDS;
      expect(convert(1, from, to)).to.be.equal(60);
      expect(convert(2, from, to)).to.be.equal(120);
      expect(convert(1.5, from, to)).to.be.equal(90);
      expect(convert(10, from, to)).to.be.equal(600);
    });

    it('should convert to hours', () => {
      to = TRANSFORM_MEASURES.HOURS;
      expect(convert(60, from, to)).to.be.equal(1);
      expect(convert(30, from, to)).to.be.equal(0.5);
      expect(convert(120, from, to)).to.be.equal(2);
      expect(convert(600, from, to)).to.be.equal(10);
    });

    it('should convert to days', () => {
      to = TRANSFORM_MEASURES.DAYS;
      expect(convert(1440, from, to)).to.be.equal(1);
      expect(convert(720, from, to)).to.be.equal(0.5);
      expect(convert(2880, from, to)).to.be.equal(2);
      expect(convert(14400, from, to)).to.be.equal(10);
    });

    it('should convert to weeks', () => {
      to = TRANSFORM_MEASURES.WEEKS;
      expect(convert(10080, from, to)).to.be.equal(1);
      expect(convert(5040, from, to)).to.be.equal(0.5);
      expect(convert(20160, from, to)).to.be.equal(2);
      expect(convert(100800, from, to)).to.be.equal(10);
    });
  });

  describe('from hours', () => {
    const from = TRANSFORM_MEASURES.HOURS;
    let to;

    it('should convert to milliseconds', () => {
      to = TRANSFORM_MEASURES.MILLISECONDS;
      expect(convert(1, from, to)).to.be.equal(3600000);
      expect(convert(0.5, from, to)).to.be.equal(1800000);
      expect(convert(2, from, to)).to.be.equal(7200000);
      expect(convert(10, from, to)).to.be.equal(36000000);
    });

    it('should convert to seconds', () => {
      to = TRANSFORM_MEASURES.SECONDS;
      expect(convert(1, from, to)).to.be.equal(3600);
      expect(convert(0.5, from, to)).to.be.equal(1800);
      expect(convert(2, from, to)).to.be.equal(7200);
      expect(convert(10, from, to)).to.be.equal(36000);
    });


    it('should convert to days', () => {
      to = TRANSFORM_MEASURES.DAYS;
      expect(convert(24, from, to)).to.be.equal(1);
      expect(convert(12, from, to)).to.be.equal(0.5);
      expect(convert(48, from, to)).to.be.equal(2);
      expect(convert(240, from, to)).to.be.equal(10);
    });

    it('should convert to weeks', () => {
      to = TRANSFORM_MEASURES.WEEKS;
      expect(convert(168, from, to)).to.be.equal(1);
      expect(convert(84, from, to)).to.be.equal(0.5);
      expect(convert(336, from, to)).to.be.equal(2);
      expect(convert(1680, from, to)).to.be.equal(10);
    });
  });

  describe('from days', () => {
    const from = TRANSFORM_MEASURES.DAYS;
    let to;

    it('should convert to milliseconds', () => {
      to = TRANSFORM_MEASURES.MILLISECONDS;
      expect(convert(1, from, to)).to.be.equal(86400000);
      expect(convert(0.5, from, to)).to.be.equal(43200000);
      expect(convert(2, from, to)).to.be.equal(172800000);
      expect(convert(10, from, to)).to.be.equal(864000000);
    });
  
    it('should convert to seconds', () => {
      to = TRANSFORM_MEASURES.SECONDS;
      expect(convert(1, from, to)).to.be.equal(86400);
      expect(convert(0.5, from, to)).to.be.equal(43200);
      expect(convert(2, from, to)).to.be.equal(172800);
      expect(convert(10, from, to)).to.be.equal(864000);
    });

    it('should convert to minutes', () => {
      to = TRANSFORM_MEASURES.MINUTES;
      expect(convert(1, from, to)).to.be.equal(1440);
      expect(convert(0.5, from, to)).to.be.equal(720);
      expect(convert(2, from, to)).to.be.equal(2880);
      expect(convert(10, from, to)).to.be.equal(14400);
    });

    it('should convert to hours', () => {
      to = TRANSFORM_MEASURES.HOURS;
      expect(convert(1, from, to)).to.be.equal(24);
      expect(convert(0.5, from, to)).to.be.equal(12);
      expect(convert(2, from, to)).to.be.equal(48);
      expect(convert(10, from, to)).to.be.equal(240);
    });

    it('should convert to weeks', () => {
      to = TRANSFORM_MEASURES.WEEKS;
      expect(convert(7, from, to)).to.be.equal(1);
      expect(convert(3.5, from, to)).to.be.equal(0.5);
      expect(convert(14, from, to)).to.be.equal(2);
      expect(convert(70, from, to)).to.be.equal(10);
    });
  });

  describe('from weeks', () => {
    const from = TRANSFORM_MEASURES.WEEKS;
    let to;

    it('should convert to milliseconds', () => {
      to = TRANSFORM_MEASURES.MILLISECONDS;
      expect(convert(1, from, to)).to.be.equal(604800000);
      expect(convert(0.5, from, to)).to.be.equal(302400000);
      expect(convert(2, from, to)).to.be.equal(1209600000);
      expect(convert(10, from, to)).to.be.equal(6048000000);
    });

    it('should convert to seconds', () => {
      to = TRANSFORM_MEASURES.SECONDS;
      expect(convert(1, from, to)).to.be.equal(604800);
      expect(convert(0.5, from, to)).to.be.equal(302400);
      expect(convert(2, from, to)).to.be.equal(1209600);
      expect(convert(10, from, to)).to.be.equal(6048000);
    });

    it('should convert to minutes', () => {
      to = TRANSFORM_MEASURES.MINUTES;
      expect(convert(1, from, to)).to.be.equal(10080);
      expect(convert(0.5, from, to)).to.be.equal(5040);
      expect(convert(2, from, to)).to.be.equal(20160);
      expect(convert(10, from, to)).to.be.equal(100800);
    });

    it('should convert to hours', () => {
      to = TRANSFORM_MEASURES.HOURS;
      expect(convert(1, from, to)).to.be.equal(168);
      expect(convert(0.5, from, to)).to.be.equal(84);
      expect(convert(2, from, to)).to.be.equal(336);
      expect(convert(10, from, to)).to.be.equal(1680);
    });

    it('should convert to days', () => {
      to = TRANSFORM_MEASURES.DAYS;
      expect(convert(1, from, to)).to.be.equal(7);
      expect(convert(0.5, from, to)).to.be.equal(3.5);
      expect(convert(2, from, to)).to.be.equal(14);
      expect(convert(10, from, to)).to.be.equal(70);
    });


  });
});
