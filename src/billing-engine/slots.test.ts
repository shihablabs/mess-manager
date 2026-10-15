import { describe, expect, it } from 'vitest';
import { calculateSlotDistribution, generateBazarSlotRanges } from './slots';

describe('Bazar Slot Engine (Task 7 & SRS 4.6)', () => {
  it('correctly distributes days equally when totalDays is divisible by buyerCount', () => {
    // 30 days, 6 buyers -> 5 days each, 0 remainder
    const distribution = calculateSlotDistribution(30, 6);
    expect(distribution).toEqual([5, 5, 5, 5, 5, 5]);
    expect(distribution.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('correctly assigns remainder days to the first slots', () => {
    // 31 days, 6 buyers -> 31 / 6 = 5 remainder 1 -> first slot gets 6, next 5 get 5
    const dist1 = calculateSlotDistribution(31, 6);
    expect(dist1).toEqual([6, 5, 5, 5, 5, 5]);
    expect(dist1.reduce((a, b) => a + b, 0)).toBe(31);

    // 30 days, 4 buyers -> 30 / 4 = 7 remainder 2 -> first 2 slots get 8, next 2 get 7
    const dist2 = calculateSlotDistribution(30, 4);
    expect(dist2).toEqual([8, 8, 7, 7]);
    expect(dist2.reduce((a, b) => a + b, 0)).toBe(30);

    // 31 days, 7 buyers -> 31 / 7 = 4 remainder 3 -> first 3 slots get 5, next 4 get 4
    const dist3 = calculateSlotDistribution(31, 7);
    expect(dist3).toEqual([5, 5, 5, 4, 4, 4, 4]);
    expect(dist3.reduce((a, b) => a + b, 0)).toBe(31);
  });

  it('generates seamless date ranges covering the entire cycle without gaps', () => {
    // Cycle from 2026-10-10 to 2026-11-09 (31 days) with 6 buyers
    const ranges = generateBazarSlotRanges('2026-10-10', '2026-11-09', 6);
    expect(ranges.length).toBe(6);

    // Check slot 1 duration is 6 days (remainder to first slot)
    expect(ranges[0].startDate).toBe('2026-10-10');
    expect(ranges[0].endDate).toBe('2026-10-15');
    expect(ranges[0].durationDays).toBe(6);

    // Check subsequent slots are 5 days each
    expect(ranges[1].startDate).toBe('2026-10-16');
    expect(ranges[1].endDate).toBe('2026-10-20');
    expect(ranges[1].durationDays).toBe(5);

    // Check cross-month boundary
    expect(ranges[4].startDate).toBe('2026-10-31');
    expect(ranges[4].endDate).toBe('2026-11-04');
    expect(ranges[4].durationDays).toBe(5);

    // Check final slot ends on cycle end date
    expect(ranges[5].startDate).toBe('2026-11-05');
    expect(ranges[5].endDate).toBe('2026-11-09');
    expect(ranges[5].durationDays).toBe(5);

    const totalCalculatedDays = ranges.reduce((sum, r) => sum + r.durationDays, 0);
    expect(totalCalculatedDays).toBe(31);
  });
});
