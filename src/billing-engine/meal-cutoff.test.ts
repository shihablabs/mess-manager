import { describe, expect, it } from 'vitest';
import {
  getMealSlotCutoffDateTime,
  isMealRequestLate,
  MealSlotCutoffConfig,
  getDhakaDateStr,
} from './meal-cutoff';

describe('Meal Request Dynamic Cutoff Engine & Timezone (SRS 4.5 & Task 8 & Item 1/ঙ)', () => {
  const mealSlotsWithOffsets: MealSlotCutoffConfig[] = [
    { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00', cutoffDayOffset: -1 }, // night before
    { id: 'lunch', name: 'দুপুর', weight: 1.0, cutoffTime: '09:00', cutoffDayOffset: 0 }, // same day 9 AM
    { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00', cutoffDayOffset: 0 }, // same day 4 PM
  ];

  it('correctly calculates cutoff date for night-before morning slot with explicit offset -1', () => {
    // For 2026-10-20 morning, cutoff is 2026-10-19 22:00 Dhaka time (16:00 UTC)
    const morningSlot = mealSlotsWithOffsets[0];
    const cutoff = getMealSlotCutoffDateTime('2026-10-20', morningSlot);

    expect(cutoff.toISOString()).toBe('2026-10-19T16:00:00.000Z');
  });

  it('correctly calculates cutoff date for same-day slots with explicit offset 0', () => {
    // For 2026-10-20 lunch at 09:00 Dhaka time (03:00 UTC)
    const lunchSlot = mealSlotsWithOffsets[1];
    const lunchCutoff = getMealSlotCutoffDateTime('2026-10-20', lunchSlot);
    expect(lunchCutoff.toISOString()).toBe('2026-10-20T03:00:00.000Z');

    // For 2026-10-20 night at 16:00 Dhaka time (10:00 UTC)
    const nightSlot = mealSlotsWithOffsets[2];
    const nightCutoff = getMealSlotCutoffDateTime('2026-10-20', nightSlot);
    expect(nightCutoff.toISOString()).toBe('2026-10-20T10:00:00.000Z');
  });

  it('falls back to previous rules when cutoffDayOffset is absent (legacy fallback)', () => {
    // Legacy morning slot without cutoffDayOffset -> previous day (-1)
    const legacyMorning: MealSlotCutoffConfig = {
      id: 'morning',
      name: 'সকাল',
      weight: 0.5,
      cutoffTime: '22:00',
    };
    const cutoffMorning = getMealSlotCutoffDateTime('2026-10-20', legacyMorning);
    expect(cutoffMorning.toISOString()).toBe('2026-10-19T16:00:00.000Z');

    // Legacy slot with hour >= 18 (e.g. 20:00) without cutoffDayOffset -> previous day (-1)
    const legacyEvening: MealSlotCutoffConfig = {
      id: 'custom_dinner',
      name: 'ডিনার',
      weight: 1.0,
      cutoffTime: '20:00',
    };
    const cutoffEvening = getMealSlotCutoffDateTime('2026-10-20', legacyEvening);
    expect(cutoffEvening.toISOString()).toBe('2026-10-19T14:00:00.000Z');

    // Legacy slot with hour < 18 (e.g. 15:00) without cutoffDayOffset -> same day (0)
    const legacyLunch: MealSlotCutoffConfig = {
      id: 'custom_lunch',
      name: 'লাঞ্চ',
      weight: 1.0,
      cutoffTime: '15:00',
    };
    const cutoffLunch = getMealSlotCutoffDateTime('2026-10-20', legacyLunch);
    expect(cutoffLunch.toISOString()).toBe('2026-10-20T09:00:00.000Z');
  });

  it('allows overriding defaults (e.g. morning on same day or dinner on previous day)', () => {
    // Custom morning with same day (offset 0) at 06:00 AM Dhaka
    const sameDayMorning: MealSlotCutoffConfig = {
      id: 'morning',
      name: 'সকাল',
      weight: 0.5,
      cutoffTime: '06:00',
      cutoffDayOffset: 0,
    };
    const cutoff1 = getMealSlotCutoffDateTime('2026-10-20', sameDayMorning);
    expect(cutoff1.toISOString()).toBe('2026-10-20T00:00:00.000Z');

    // Custom dinner with previous day (offset -1) at 23:00 Dhaka
    const prevDayDinner: MealSlotCutoffConfig = {
      id: 'night',
      name: 'রাত',
      weight: 1.0,
      cutoffTime: '23:00',
      cutoffDayOffset: -1,
    };
    const cutoff2 = getMealSlotCutoffDateTime('2026-10-20', prevDayDinner);
    expect(cutoff2.toISOString()).toBe('2026-10-19T17:00:00.000Z');
  });

  it('evaluates on-time and late requests accurately under UTC server environment (Vercel UTC test)', () => {
    const mealDate = '2026-10-20';

    // Morning slot deadline: 2026-10-19 22:00 Dhaka = 2026-10-19 16:00 UTC
    // 15:59 UTC (21:59 Dhaka) -> ON TIME
    const onTimeUtcMorning = new Date('2026-10-19T15:59:00.000Z');
    expect(isMealRequestLate(mealDate, 'morning', mealSlotsWithOffsets, onTimeUtcMorning)).toBe(false);

    // 16:01 UTC (22:01 Dhaka) -> LATE
    const lateUtcMorning = new Date('2026-10-19T16:01:00.000Z');
    expect(isMealRequestLate(mealDate, 'morning', mealSlotsWithOffsets, lateUtcMorning)).toBe(true);

    // Night slot deadline: 2026-10-20 16:00 Dhaka = 2026-10-20 10:00 UTC
    // 09:59 UTC (15:59 Dhaka) -> ON TIME
    const onTimeUtcNight = new Date('2026-10-20T09:59:00.000Z');
    expect(isMealRequestLate(mealDate, 'night', mealSlotsWithOffsets, onTimeUtcNight)).toBe(false);

    // 10:01 UTC (16:01 Dhaka) -> LATE
    const lateUtcNight = new Date('2026-10-20T10:01:00.000Z');
    expect(isMealRequestLate(mealDate, 'night', mealSlotsWithOffsets, lateUtcNight)).toBe(true);
  });

  it('getDhakaDateStr returns the correct calendar date in Dhaka regardless of UTC server time', () => {
    // 8:00 PM UTC on Oct 15 is 2:00 AM on Oct 16 in Asia/Dhaka (+06:00)
    const nightUtcTime = new Date('2026-10-15T20:00:00.000Z');
    expect(getDhakaDateStr(nightUtcTime)).toBe('2026-10-16');

    // 5:00 PM UTC on Oct 15 is 11:00 PM on Oct 15 in Asia/Dhaka (+06:00)
    const eveningUtcTime = new Date('2026-10-15T17:00:00.000Z');
    expect(getDhakaDateStr(eveningUtcTime)).toBe('2026-10-15');
  });
});
