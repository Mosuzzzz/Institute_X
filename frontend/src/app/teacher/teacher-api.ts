import type { TeacherCourseDto } from '../../lib/backend-api';
import type { Language } from '../../lib/language';
import { translateCategory } from '../../lib/reference-translations';
import type { TeacherCourse } from './teacher-data';

export function toTeacherCourse(course: TeacherCourseDto, language: Language = 'en'): TeacherCourse {
  const latest = course.versions[0];
  const status = latest?.status === 'SUPERSEDED' ? 'PUBLISHED' : latest?.status ?? 'DRAFT';
  return {
    id: course.id,
    title: latest?.title ?? 'Untitled course',
    version: latest?.versionNumber ?? 1,
    status,
    updated: new Date(latest?.updatedAt ?? course.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    category: course.categories[0] ? translateCategory(course.categories[0].category, language) : 'Uncategorised',
    completion: status === 'PUBLISHED' || status === 'SUBMITTED' ? 100 : 50,
    note: latest?.reviews[0]?.reviewComment ?? 'Course data loaded from the backend.',
  };
}
