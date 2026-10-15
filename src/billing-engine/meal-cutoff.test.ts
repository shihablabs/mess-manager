import { describe, expect, it } from 'vitest';
import { getMealSlotCutoffDateTime, isMealRequestLate, MealSlotCutoffConfig } from './meal-cutoff';

describe('Meal Request Dynamic Cutoff Engine (Task 8 & SRS 4.5)', () => {
  const mealSlots: MealSlotCutoffConfig[] = [
    { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' }, // night before
    { id: 'lunch', name: 'দুপুর', weight: 1.0, cutoffTime: '09:00' }, // same day 9 AM
    { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' }, // same day 4 PM
  ];

  it('correctly calculates cutoff date for night-before morning slot', () => {
    // For 2026-10-20 morning, cutoff should be 2026-10-19 at 22:00
    const morningSlot = mealSlots[0];
    const cutoff = getMealSlotCutoffDateTime('2026-10-20', morningSlot);

    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(9); // 0-indexed October
    expect(cutoff.getDate()).toBe(19);
    expect(cutoff.getHours()).toBe(22);
    expect(cutoff.getMinutes()).toBe(0);
  });

  it('correctly calculates cutoff date for same-day dinner slot', () => {
    // For 2026-10-20 night, cutoff should be 2026-10-20 at 16:00
    const nightSlot = mealSlots[2];
    const cutoff = getMealSlotCutoffDateTime('2026-10-20', nightSlot);

    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(9);
    expect(cutoff.getDate()).toBe(20);
    expect(cutoff.getHours()).toBe(16);
    expect(cutoff.getMinutes()).toBe(0);
  });

  it('evaluates on-time and late requests dynamically based on configured cutoffTime', () => {
    const mealDate = '2026-10-20';

    // Morning slot tests:
    // Before cutoff: 2026-10-19 21:30:00 -> NOT late
    const onTimeMorning = new Date(2026, 9, 19, 21, 30, 0);
    expect(isMealRequestLate(mealDate, 'morning', mealSlots, onTimeMorning)).toBe(false);

    // After cutoff: 2026-10-19 22:15:00 -> LATE
    const lateMorning = new Date(2026, 9, 19, 22, 15, 0);
    expect(isMealRequestLate(mealDate, 'morning', mealSlots, lateMorning)).toBe(true);

    // Night slot tests:
    // Before cutoff: 2026-10-20 15:45:00 -> NOT late
    const onTimeNight = new Date(2026, 9, 20, 15, 45, 0);
    expect(isMealRequestLate(mealDate, 'night', mealSlots, onTimeNight)).toBe(false);

    // After cutoff: 2026-10-20 16:05:00 -> LATE
    const lateNight = new Date(2026, 9, 20, 16, 5, 0);
    expect(isMealRequestLate(mealDate, 'night', mealSlots, lateNight)).toBe(true);
  });

  it('respects changed cutoffTime from manager configuration (e.g. 17:30)', () => {
    const customSlots: MealSlotCutoffConfig[] = [
      { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '17:30' },
    ];

    const mealDate = '2026-10-20';
    // 16:30 is now on-time with 17:30 cutoff (would have been late with 16:00 cutoff)
    const timeAt1630 = new Date(2026, 9, 20, 16, 30, 0);
    expect(isMealRequestLate(mealDate, 'night', customSlots, timeAt1630)).toBe(false);

    const timeAt1745 = new Date(2026, 9, 20, 17, 45, 0);
    expect(isMealRequestLate(mealDate, 'night', customSlots, timeAt1745)).toBe(true);
  });
});
