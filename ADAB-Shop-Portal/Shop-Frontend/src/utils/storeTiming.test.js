import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  isWithinOperatingHours,
  getStoreTimingStatus
} from './storeTiming';

describe('storeTiming Utility', () => {
  describe('parseTimeToMinutes', () => {
    it('parses standard 24-hour time strings', () => {
      expect(parseTimeToMinutes('08:00')).toBe(480);
      expect(parseTimeToMinutes('08:00:00')).toBe(480);
      expect(parseTimeToMinutes('22:00')).toBe(1320);
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('parses 12-hour time strings with AM/PM', () => {
      expect(parseTimeToMinutes('8:00 AM')).toBe(480);
      expect(parseTimeToMinutes('10:00 PM')).toBe(1320);
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
    });

    it('returns null for empty or invalid input', () => {
      expect(parseTimeToMinutes('')).toBeNull();
      expect(parseTimeToMinutes(null)).toBeNull();
      expect(parseTimeToMinutes('invalid')).toBeNull();
    });
  });

  describe('formatMinutesTo12Hour', () => {
    it('formats minutes into standard 12-hour format with AM/PM', () => {
      expect(formatMinutesTo12Hour(480)).toBe('8:00 AM');
      expect(formatMinutesTo12Hour(1320)).toBe('10:00 PM');
      expect(formatMinutesTo12Hour(0)).toBe('12:00 AM');
      expect(formatMinutesTo12Hour(720)).toBe('12:00 PM');
    });
  });

  describe('isWithinOperatingHours', () => {
    it('evaluates standard daytime operating hours (08:00 - 22:00)', () => {
      // 10:00 AM -> open
      const midDay = new Date(2026, 9, 16, 10, 0, 0);
      expect(isWithinOperatingHours('08:00:00', '22:00:00', midDay)).toBe(true);

      // 07:30 AM -> closed (before opening)
      const earlyMorning = new Date(2026, 9, 16, 7, 30, 0);
      expect(isWithinOperatingHours('08:00:00', '22:00:00', earlyMorning)).toBe(false);

      // 10:30 PM (22:30) -> closed (after closing)
      const lateNight = new Date(2026, 9, 16, 22, 30, 0);
      expect(isWithinOperatingHours('08:00:00', '22:00:00', lateNight)).toBe(false);
    });

    it('evaluates overnight operating hours (20:00 - 04:00)', () => {
      // 11:00 PM -> open
      const night = new Date(2026, 9, 16, 23, 0, 0);
      expect(isWithinOperatingHours('20:00:00', '04:00:00', night)).toBe(true);

      // 02:00 AM -> open
      const postMidnight = new Date(2026, 9, 16, 2, 0, 0);
      expect(isWithinOperatingHours('20:00:00', '04:00:00', postMidnight)).toBe(true);

      // 02:00 PM (14:00) -> closed
      const afternoon = new Date(2026, 9, 16, 14, 0, 0);
      expect(isWithinOperatingHours('20:00:00', '04:00:00', afternoon)).toBe(false);
    });
  });

  describe('getStoreTimingStatus', () => {
    it('returns open status when online and within hours', () => {
      const store = {
        is_online: true,
        open_time: '08:00:00',
        close_time: '22:00:00'
      };
      const midDay = new Date(2026, 9, 16, 14, 0, 0);
      const status = getStoreTimingStatus(store, midDay);

      expect(status.isOpen).toBe(true);
      expect(status.statusLabel).toBe('Store: Open');
      expect(status.reason).toBe('open_scheduled');
      expect(status.dotClass).toContain('animate-pulse');
    });

    it('returns closed status when outside operating hours even if is_online is true', () => {
      const store = {
        is_online: true,
        open_time: '08:00:00',
        close_time: '22:00:00'
      };
      // 11:30 PM (23:30)
      const lateNight = new Date(2026, 9, 16, 23, 30, 0);
      const status = getStoreTimingStatus(store, lateNight);

      expect(status.isOpen).toBe(false);
      expect(status.statusLabel).toBe('Store: Closed');
      expect(status.reason).toBe('outside_hours');
      expect(status.isWithinHours).toBe(false);
    });

    it('returns closed status when is_online is false, even if inside operating hours', () => {
      const store = {
        is_online: false,
        open_time: '08:00:00',
        close_time: '22:00:00'
      };
      // 2:00 PM (within operating hours, but manually turned off)
      const midDay = new Date(2026, 9, 16, 14, 0, 0);
      const status = getStoreTimingStatus(store, midDay);

      expect(status.isOpen).toBe(false);
      expect(status.statusLabel).toBe('Store: Closed');
      expect(status.reason).toBe('manual_closed');
      expect(status.isManuallyClosed).toBe(true);
      expect(status.isWithinHours).toBe(true);
    });
  });
});
