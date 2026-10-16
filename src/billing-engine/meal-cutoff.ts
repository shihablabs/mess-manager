/**
 * Meal Request Cutoff Engine (SRS Section 4.5 & Task 8)
 * Evaluates whether a meal change request is submitted before or after the deadline
 * dynamically configured in messes.mealSlots[].cutoffTime.
 */

export interface MealSlotCutoffConfig {
  id: string;
  name: string;
  weight: number;
  cutoffTime?: string; // HH:MM, e.g. "22:00", "16:00"
  cutoffDayOffset?: number; // e.g. -1 for previous day (night before), 0 for same day
}

/**
 * Returns YYYY-MM-DD date string in Asia/Dhaka timezone.
 * Essential when server environment is UTC (e.g. Vercel).
 */
export function getDhakaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Calculates the exact cutoff timestamp for a meal date and slot in Asia/Dhaka (+06:00).
 * - If slot.cutoffDayOffset is defined (-1 or 0), it is used directly.
 * - Otherwise fallback to legacy rule: if slot.id === 'morning' or cutoffHour >= 18, offset is -1, else 0.
 * - Resolves to exact Asia/Dhaka (+06:00) UTC timestamp so behavior is invariant on UTC servers (e.g. Vercel).
 */
export function getMealSlotCutoffDateTime(
  mealDateStr: string,
  slot: MealSlotCutoffConfig,
): Date {
  const [year, month, day] = mealDateStr.split('-').map(Number);
  const cutoffTime = slot.cutoffTime || (slot.id === 'morning' ? '22:00' : '16:00');
  const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);

  let offsetDays: number;
  if (slot.cutoffDayOffset !== undefined && slot.cutoffDayOffset !== null) {
    offsetDays = Number(slot.cutoffDayOffset);
  } else {
    // Legacy fallback rule
    const isPreviousDay = slot.id === 'morning' || (cutoffHour !== undefined && cutoffHour >= 18);
    offsetDays = isPreviousDay ? -1 : 0;
  }

  // Calculate target date using UTC arithmetic to avoid host timezone interference
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  baseDate.setUTCDate(baseDate.getUTCDate() + offsetDays);

  const targetY = baseDate.getUTCFullYear();
  const targetM = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const targetD = String(baseDate.getUTCDate()).padStart(2, '0');
  const targetH = String(cutoffHour || 0).padStart(2, '0');
  const targetMin = String(cutoffMin || 0).padStart(2, '0');

  // Exact ISO string fixed to Asia/Dhaka (+06:00)
  return new Date(`${targetY}-${targetM}-${targetD}T${targetH}:${targetMin}:00+06:00`);
}

/**
 * Checks whether a meal request is late based on dynamic mess mealSlots configuration.
 */
export function isMealRequestLate(
  mealDateStr: string,
  slotId: string,
  mealSlots: MealSlotCutoffConfig[],
  now = new Date(),
): boolean {
  if (!mealSlots || mealSlots.length === 0) return false;

  let targetSlots: MealSlotCutoffConfig[] = [];
  if (slotId === 'all' || slotId === 'both') {
    targetSlots = mealSlots;
  } else {
    const matched = mealSlots.find((s) => s.id === slotId);
    if (matched) {
      targetSlots = [matched];
    } else {
      targetSlots = mealSlots;
    }
  }

  for (const slot of targetSlots) {
    const cutoffDateTime = getMealSlotCutoffDateTime(mealDateStr, slot);
    if (now.getTime() > cutoffDateTime.getTime()) {
      return true;
    }
  }

  return false;
}
