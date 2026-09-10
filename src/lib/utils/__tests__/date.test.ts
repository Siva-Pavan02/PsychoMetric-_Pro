import { formatDate, formatDateTime } from '../date';

describe('Date Utilities', () => {
  describe('formatDate()', () => {
    it('returns "-" for null or undefined', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
    });

    it('returns "Invalid Date" for invalid date', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });

    it('formats a valid UTC string correctly', () => {
      expect(formatDate('2026-09-02T08:00:00.000Z')).toBe('02 Sep 2026');
    });

    it('formats a valid Date object correctly', () => {
      expect(formatDate(new Date('2026-09-02T08:00:00.000Z'))).toBe('02 Sep 2026');
    });

    it('formats a numeric timestamp correctly', () => {
      const timestamp = new Date('2026-09-02T08:00:00.000Z').getTime();
      expect(formatDate(timestamp)).toBe('02 Sep 2026');
    });

    describe('midnight boundary conversion', () => {
      // 18:29:59 UTC = 23:59:59 IST (Same day as UTC)
      it('handles previous UTC day -> same IST day (just before midnight)', () => {
        expect(formatDate('2026-09-01T18:29:59.000Z')).toBe('01 Sep 2026');
      });

      // 18:30:00 UTC = 00:00:00 IST (Next day)
      it('handles previous UTC day -> next IST day (at midnight)', () => {
        expect(formatDate('2026-09-01T18:30:00.000Z')).toBe('02 Sep 2026');
      });

      it('boundary test: 2026-09-01T18:59:59.000Z -> Sep 2', () => {
        expect(formatDate('2026-09-01T18:59:59.000Z')).toBe('02 Sep 2026');
      });

      it('boundary test: 2026-09-01T19:00:00.000Z -> Sep 2', () => {
        expect(formatDate('2026-09-01T19:00:00.000Z')).toBe('02 Sep 2026');
      });
      
      it('boundary test: 2026-09-02T00:00:00.000Z -> Sep 2', () => {
        expect(formatDate('2026-09-02T00:00:00.000Z')).toBe('02 Sep 2026');
      });

      it('boundary test: 2026-09-02T02:00:00.000Z -> Sep 2', () => {
        expect(formatDate('2026-09-02T02:00:00.000Z')).toBe('02 Sep 2026');
      });
    });
  });

  describe('formatDateTime()', () => {
    it('returns "-" for null or undefined', () => {
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
    });

    it('returns "Invalid Date" for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('Invalid Date');
    });

    it('formats a valid UTC string correctly (IST conversion)', () => {
      expect(formatDateTime('2026-09-02T08:00:00.000Z')).toBe('02 Sep 2026, 01:30 PM IST'); 
    });

    it('formats a valid Date object correctly', () => {
      expect(formatDateTime(new Date('2026-09-02T08:00:00.000Z'))).toBe('02 Sep 2026, 01:30 PM IST');
    });

    it('formats a numeric timestamp correctly', () => {
      const timestamp = new Date('2026-09-02T08:00:00.000Z').getTime();
      expect(formatDateTime(timestamp)).toBe('02 Sep 2026, 01:30 PM IST');
    });

    describe('Critical timezone boundary tests', () => {
      it('2026-09-01T18:59:59.000Z', () => {
        expect(formatDateTime('2026-09-01T18:59:59.000Z')).toBe('02 Sep 2026, 12:29 AM IST');
      });

      it('2026-09-01T19:00:00.000Z', () => {
        expect(formatDateTime('2026-09-01T19:00:00.000Z')).toBe('02 Sep 2026, 12:30 AM IST');
      });

      it('2026-09-02T00:00:00.000Z', () => {
        expect(formatDateTime('2026-09-02T00:00:00.000Z')).toBe('02 Sep 2026, 05:30 AM IST');
      });

      it('2026-09-02T02:00:00.000Z', () => {
        expect(formatDateTime('2026-09-02T02:00:00.000Z')).toBe('02 Sep 2026, 07:30 AM IST');
      });
    });
  });

  describe('Environment independence (Regression protection)', () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it('formats correctly even when server timezone is UTC (Vercel behavior)', () => {
      process.env.TZ = 'UTC';
      const output = formatDateTime('2026-09-01T19:00:00.000Z');
      expect(output).toBe('02 Sep 2026, 12:30 AM IST');
    });

    it('formats correctly even when server timezone is America/New_York', () => {
      process.env.TZ = 'America/New_York';
      expect(formatDateTime('2026-09-01T19:00:00.000Z')).toBe('02 Sep 2026, 12:30 AM IST');
    });
    
    it('formats date correctly even when server timezone is UTC', () => {
      process.env.TZ = 'UTC';
      expect(formatDate('2026-09-01T19:00:00.000Z')).toBe('02 Sep 2026');
    });
  });
});

