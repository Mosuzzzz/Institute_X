import type { TeacherCourseDto } from '../../lib/backend-api';
import type { Language } from '../../lib/language';
import { translateCategory } from '../../lib/reference-translations';
import { courseLanguageLabel } from '../../lib/course-language';
import type { TeacherCourse } from './teacher-data';
import { translateUi } from '../../lib/ui-translations';

export function toTeacherCourse(course: TeacherCourseDto, language: Language = 'en'): TeacherCourse {
  const latest = course.versions[0];
  const status = latest?.status === 'SUPERSEDED' ? 'PUBLISHED' : latest?.status ?? 'DRAFT';
  return {
    id: course.id,
    title: latest?.title ?? translateUi('Untitled course', language),
    version: latest?.versionNumber ?? 1,
    status,
    updated: new Date(latest?.updatedAt ?? course.createdAt).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }),
    category: course.categories[0] ? translateCategory(course.categories[0].category, language) : translateUi('Uncategorised', language),
    language: courseLanguageLabel(latest?.languageCode ?? 'th', language),
    completion: status === 'APPROVED' || status === 'PUBLISHED' || status === 'UNPUBLISHED' || status === 'SUBMITTED' ? 100 : 50,
    note: latest?.reviews[0]?.reviewComment ?? '',
  };
}
