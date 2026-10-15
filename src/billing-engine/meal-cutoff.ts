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
}

/**
 * Calculates the exact cutoff timestamp for a meal date and slot.
 * - If cutoffHour >= 18 or slot.id === 'morning', the deadline is on the day prior to mealDate.
 * - Otherwise (e.g. lunch 09:00, night 16:00), the deadline is on the same day as mealDate.
 */
export function getMealSlotCutoffDateTime(
  mealDateStr: string,
  slot: MealSlotCutoffConfig,
): Date {
  const [year, month, day] = mealDateStr.split('-').map(Number);
  const cutoffTime = slot.cutoffTime || (slot.id === 'morning' ? '22:00' : '16:00');
  const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);

  const isPreviousDay = slot.id === 'morning' || (cutoffHour !== undefined && cutoffHour >= 18);

  const targetDate = new Date(year, month - 1, day);
  if (isPreviousDay) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  targetDate.setHours(cutoffHour || 0, cutoffMin || 0, 0, 0);
  return targetDate;
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
