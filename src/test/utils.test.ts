import { describe, it, expect } from 'vitest';
import { oklchToRgb } from '../lib/color_converter';
import { parseCSVText } from '../lib/csv_parser';
import { 
  cn, 
  formatCurrency, 
  formatNumber, 
  formatPercentage, 
  formatTimestamp, 
  formatRelativeDate, 
  getRiskTier, 
  getRiskColorClasses, 
  getStatusBadgeClasses 
} from '../lib/utils';

describe('Core Utility Functions & Converters', () => {
  describe('color_converter.ts', () => {
    it('accurately converts OKLCH color coordinates to sRGB and HEX', () => {
      // Pure White (L=1, C=0, H=0)
      const white = oklchToRgb(1.0, 0, 0);
      expect(white.r).toBe(255);
      expect(white.g).toBe(255);
      expect(white.b).toBe(255);
      expect(white.hex).toBe('#ffffff');

      // Pure Black (L=0, C=0, H=0)
      const black = oklchToRgb(0, 0, 0);
      expect(black.r).toBe(0);
      expect(black.g).toBe(0);
      expect(black.b).toBe(0);
      expect(black.hex).toBe('#000000');

      // Vibrant Blue (L=0.6, C=0.2, H=260)
      const blue = oklchToRgb(0.6, 0.2, 260, 0.9);
      expect(blue.r).toBeGreaterThanOrEqual(0);
      expect(blue.g).toBeGreaterThanOrEqual(0);
      expect(blue.b).toBeGreaterThan(blue.r); // dominant blue
      expect(blue.a).toBe(0.9);
      expect(blue.rgbString).toContain('rgba');
    });

    it('handles normalized percentage luminance values (> 1.0)', () => {
      const result = oklchToRgb(85, 0.15, 140);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.hex).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('csv_parser.ts', () => {
    it('returns empty result with error for blank or single-line CSV', () => {
      const result = parseCSVText('');
      expect(result.transactions.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);

      const headerOnly = parseCSVText('id,customer,amount,merchant');
      expect(headerOnly.transactions.length).toBe(0);
    });

    it('parses valid CSV transactions and infers risk attributes and tags', () => {
      const csv = `transaction_id,customer_id,amount,merchant,timestamp,city,device,ip_address,payment_method
TXN-CSV-99,CUST-77,15000.00,Binance Global Crypto,2026-08-07T12:00:00Z,Zurich/Switzerland,Android 14 Headless Emulator,185.220.101.5,Wire Transfer
TXN-CSV-100,CUST-88,45.00,Starbucks Coffee,2026-08-07T12:05:00Z,Seattle/United States,iPhone 15 iOS,73.189.44.12,Credit Card`;

      const result = parseCSVText(csv);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.transactions.length).toBe(2);

      const fraudRow = result.transactions[0];
      expect(fraudRow.amount).toBe(15000.00);
      expect(fraudRow.merchant).toBe('Binance Global Crypto');
      expect(fraudRow.riskScore).toBeGreaterThanOrEqual(60);
      expect(fraudRow.flagReasons.length).toBeGreaterThan(0);
      expect(fraudRow.tags.length).toBeGreaterThan(0);

      const safeRow = result.transactions[1];
      expect(safeRow.amount).toBe(45.00);
      expect(safeRow.merchant).toBe('Starbucks Coffee');
      expect(safeRow.riskScore).toBeLessThan(50);
    });
  });

  describe('utils.ts', () => {
    it('cn merges tailwind and conditional classes correctly', () => {
      const merged = cn('p-4 text-sm', false && 'hidden', true && 'font-bold', 'p-6');
      expect(merged).toContain('text-sm');
      expect(merged).toContain('font-bold');
      expect(merged).toContain('p-6');
      expect(merged).not.toContain('p-4'); // overridden by p-6 in tailwind-merge
    });

    it('formatCurrency formats USD and custom currencies properly', () => {
      expect(formatCurrency(1250.5)).toBe('$1,250.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formatNumber formats thousands with commas', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('formatPercentage converts ratio to formatted string', () => {
      expect(formatPercentage(0.9845)).toBe('98.5%');
    });

    it('formatTimestamp handles valid and invalid ISO dates safely', () => {
      const valid = formatTimestamp('2026-08-07T12:00:00Z');
      expect(valid).toBeDefined();
      expect(valid).not.toBe('');

      const invalid = formatTimestamp('not-a-valid-date');
      expect(invalid).toBe('not-a-valid-date');
    });

    it('formatRelativeDate calculates human readable relative intervals', () => {
      const now = new Date().toISOString();
      expect(formatRelativeDate(now)).toBe('1s ago');

      const tenMinsAgo = new Date(Date.now() - 1000 * 60 * 10).toISOString();
      expect(formatRelativeDate(tenMinsAgo)).toBe('10m ago');

      const threeHoursAgo = new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString();
      expect(formatRelativeDate(threeHoursAgo)).toBe('3h ago');
    });

    it('getRiskTier maps risk scores to standard RiskTier constants', () => {
      expect(getRiskTier(95)).toBe('CRITICAL');
      expect(getRiskTier(80)).toBe('CRITICAL');
      expect(getRiskTier(75)).toBe('HIGH');
      expect(getRiskTier(60)).toBe('HIGH');
      expect(getRiskTier(50)).toBe('MEDIUM');
      expect(getRiskTier(30)).toBe('MEDIUM');
      expect(getRiskTier(20)).toBe('LOW');
      expect(getRiskTier(0)).toBe('LOW');
    });

    it('getRiskColorClasses returns distinct UI color styling for each tier', () => {
      const critical = getRiskColorClasses('CRITICAL');
      expect(critical.text).toContain('rose');

      const high = getRiskColorClasses('HIGH');
      expect(high.text).toContain('amber');

      const medium = getRiskColorClasses('MEDIUM');
      expect(medium.text).toContain('yellow');

      const low = getRiskColorClasses('LOW');
      expect(low.text).toContain('emerald');
    });

    it('getStatusBadgeClasses returns distinct badges for all statuses', () => {
      expect(getStatusBadgeClasses('rejected')).toContain('red');
      expect(getStatusBadgeClasses('flagged')).toContain('rose');
      expect(getStatusBadgeClasses('held')).toContain('amber');
      expect(getStatusBadgeClasses('escalated')).toContain('purple');
      expect(getStatusBadgeClasses('approved')).toContain('emerald');
      expect(getStatusBadgeClasses('pending')).toContain('slate');
    });
  });
});
