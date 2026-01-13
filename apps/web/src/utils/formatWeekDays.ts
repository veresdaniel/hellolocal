// src/utils/formatWeekDays.ts
/**
 * Get week days ordered by weekStartsOn setting
 */
export function getWeekDaysOrdered(weekStartsOn: number): number[] {
  // weekStartsOn: 0 = Sunday, 1 = Monday
  const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
  
  if (weekStartsOn === 1) {
    // Monday first: [1, 2, 3, 4, 5, 6, 0]
    return [1, 2, 3, 4, 5, 6, 0];
  } else {
    // Sunday first: [0, 1, 2, 3, 4, 5, 6]
    return days;
  }
}
