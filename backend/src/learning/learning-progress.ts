export function learningProgress(
  totalLessons: number,
  completedLessons: number,
  hasPreTest: boolean,
  preTestCompleted: boolean,
  hasPostTest: boolean,
  postTestPassed: boolean,
): number {
  if (!totalLessons || (hasPreTest && !preTestCompleted)) return 0;
  const fraction = Math.min(completedLessons, totalLessons) / totalLessons;
  if (fraction === 1 && (!hasPostTest || postTestPassed)) return 100;
  return Math.floor(fraction * (hasPostTest ? 90 : 100));
}
