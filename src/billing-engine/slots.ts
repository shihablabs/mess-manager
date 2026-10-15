/**
 * Bazar Slot Calculation Engine (SRS Section 4.6 & Task 7)
 * Strictly pure mathematical and date logic.
 *
 * Formula:
 * Slot days = Total cycle days ÷ Buyer count
 * Remainder distributed (+1 day) to the first slots.
 */

export function calculateSlotDistribution(
  totalDays: number,
  buyerCount: number,
): number[] {
  if (buyerCount <= 0 || totalDays <= 0) return [];
  const baseDays = Math.floor(totalDays / buyerCount);
  const remainder = totalDays % buyerCount;

  const distribution: number[] = [];
  for (let i = 0; i < buyerCount; i++) {
    distribution.push(i < remainder ? baseDays + 1 : baseDays);
  }
  return distribution;
}

export interface SlotDateRange {
  slotIndex: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
}

/**
 * Generates slot date ranges for a cycle given its start & end dates and number of buyers.
 */
export function generateBazarSlotRanges(
  startDateStr: string,
  endDateStr: string,
  buyerCount: number,
): SlotDateRange[] {
  if (buyerCount <= 0) return [];

  // Parse YYYY-MM-DD safely using local calendar parts
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const start = new Date(sY, sM - 1, sD);
  const end = new Date(eY, eM - 1, eD);

  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const slotDaysArray = calculateSlotDistribution(totalDays, buyerCount);

  const ranges: SlotDateRange[] = [];
  let currentStart = new Date(start);

  for (let i = 0; i < slotDaysArray.length; i++) {
    const duration = slotDaysArray[i];
    if (duration <= 0) continue;

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + duration - 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const fromStr = `${currentStart.getFullYear()}-${pad(currentStart.getMonth() + 1)}-${pad(currentStart.getDate())}`;
    const toStr = `${currentEnd.getFullYear()}-${pad(currentEnd.getMonth() + 1)}-${pad(currentEnd.getDate())}`;

    ranges.push({
      slotIndex: i + 1,
      startDate: fromStr,
      endDate: toStr,
      durationDays: duration,
    });

    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return ranges;
}
