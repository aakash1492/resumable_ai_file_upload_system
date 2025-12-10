import { describe, it, expect } from 'vitest';
import { formatBytes, getSpeedLabel, formatTime } from '../formatters';
import { UploadSpeed } from '../api';

describe('formatters', () => {
  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
      expect(formatBytes(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(10240)).toBe('10 KB');
      expect(formatBytes(102400)).toBe('100 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatBytes(1024 * 1024 * 10)).toBe('10 MB');
      expect(formatBytes(1024 * 1024 * 100)).toBe('100 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 10)).toBe('10 GB');
    });

    it('should handle large file sizes', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 100)).toBe('100 GB');
    });
  });

  describe('getSpeedLabel', () => {
    it('should return correct label for fast speed', () => {
      expect(getSpeedLabel('fast')).toBe('Fast');
    });

    it('should return correct label for normal speed', () => {
      expect(getSpeedLabel('normal')).toBe('Normal');
    });

    it('should return correct label for slow speed', () => {
      expect(getSpeedLabel('slow')).toBe('Slow');
    });

    it('should return correct label for verySlow speed', () => {
      expect(getSpeedLabel('verySlow')).toBe('Very Slow');
    });

    it('should handle all speed types', () => {
      const speeds: UploadSpeed[] = ['fast', 'normal', 'slow', 'verySlow'];
      speeds.forEach((speed) => {
        expect(getSpeedLabel(speed)).toBeTruthy();
        expect(typeof getSpeedLabel(speed)).toBe('string');
      });
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('0s');
      expect(formatTime(500)).toBe('0s');
      expect(formatTime(1000)).toBe('1s');
      expect(formatTime(5000)).toBe('5s');
      expect(formatTime(59000)).toBe('59s');
    });

    it('should format minutes correctly', () => {
      expect(formatTime(60 * 1000)).toBe('1m 0s');
      expect(formatTime(60 * 1000 * 5)).toBe('5m 0s');
      expect(formatTime(60 * 1000 * 5 + 30 * 1000)).toBe('5m 30s');
      expect(formatTime(60 * 1000 * 59 + 59 * 1000)).toBe('59m 59s');
    });

    it('should format hours correctly', () => {
      expect(formatTime(60 * 60 * 1000)).toBe('1h 0m 0s');
      expect(formatTime(60 * 60 * 1000 * 2)).toBe('2h 0m 0s');
      expect(formatTime(60 * 60 * 1000 * 2 + 30 * 60 * 1000)).toBe('2h 30m 0s');
      expect(formatTime(60 * 60 * 1000 * 2 + 30 * 60 * 1000 + 45 * 1000)).toBe('2h 30m 45s');
    });

    it('should handle large time values', () => {
      expect(formatTime(60 * 60 * 1000 * 24)).toBe('24h 0m 0s');
      expect(formatTime(60 * 60 * 1000 * 100)).toBe('100h 0m 0s');
    });

    it('should handle edge cases', () => {
      expect(formatTime(999)).toBe('0s');
      expect(formatTime(1001)).toBe('1s');
      expect(formatTime(59999)).toBe('59s');
      expect(formatTime(60000)).toBe('1m 0s');
    });
  });
});

