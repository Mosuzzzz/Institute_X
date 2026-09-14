import { learningProgress } from './learning-progress';

describe('optional assessments and lesson-based completion', () => {
  it('completes a course without tests only after every lesson', () => {
    expect(learningProgress(2, 0, false, true, false, false)).toBe(0);
    expect(learningProgress(2, 1, false, true, false, false)).toBe(50);
    expect(learningProgress(2, 2, false, true, false, false)).toBe(100);
  });
  it('requires both all lessons and a pass when Post-Test exists', () => {
    expect(learningProgress(2, 1, false, true, true, true)).toBeLessThan(100);
    expect(learningProgress(2, 2, false, true, true, false)).toBe(90);
    expect(learningProgress(2, 2, false, true, true, true)).toBe(100);
  });
  it('never completes while a configured Pre-Test is incomplete', () => {
    expect(learningProgress(2, 2, true, false, false, false)).toBe(0);
    expect(learningProgress(2, 2, true, true, false, false)).toBe(100);
  });
  it('does not complete an empty course', () => {
    expect(learningProgress(0, 0, false, true, false, false)).toBe(0);
  });
});
