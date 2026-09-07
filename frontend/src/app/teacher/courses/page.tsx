'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TeacherCourseDto, TeacherPermissionDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { toTeacherCourse } from '../teacher-api';
import { useAppLanguage } from '../../../lib/language';
import { staffUi } from '../../ui-styles';
import styles from './courses.module.css';

type SortOrder = 'newest' | 'oldest' | 'title';

function CourseArtwork() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <g transform="rotate(-17 40 30)">
        <rect x="29" y="9" width="25" height="36" rx="1" />
        <path d="M33 9v36M37 15h12M37 19h10M37 38h12" />
      </g>
      <g transform="rotate(12 66 64)">
        <rect x="46" y="48" width="40" height="29" rx="1" />
        <path d="M50 53h12M50 57h10M50 61h9M50 65h7" />
        <rect x="65" y="53" width="16" height="19" />
        <circle cx="75" cy="58" r="2" />
        <path d="m66 69 5-7 4 4 5-3" />
      </g>
      <g transform="rotate(-24 25 78)">
        <rect x="10" y="68" width="29" height="20" rx="2" />
        <path d="m23 73 7 5-7 5zM15 69v18M34 69v18M11 74h4M11 82h4M34 74h4M34 82h4" />
      </g>
    </svg>
  );
}

export default function TeacherCoursesPage() {
  const [language] = useAppLanguage();
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { data, error, loading } = useBackendQuery<TeacherCourseDto[]>('courses/mine');
  const permission = useBackendQuery<TeacherPermissionDto | null>('teacher-permissions/me');

  const courses = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = data
      .map((course) => toTeacherCourse(course, language))
      .filter((course) =>
        [course.title, course.category, course.status, course.language]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );

    return filtered.sort((left, right) => {
      if (sortOrder === 'title') return left.title.localeCompare(right.title);
      const difference = Date.parse(left.updated) - Date.parse(right.updated);
      return sortOrder === 'oldest' ? difference : -difference;
    });
  }, [data, language, query, sortOrder]);

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const canCreateCourse = permission.data?.status === 'APPROVED';

  return (
    <main className={styles.page}>
      <h1>Courses</h1>
      <nav className={styles.tabs} aria-label="Course workspace tabs">
        <span aria-current="page">Courses</span>
      </nav>

      <div className={styles.toolbar}>
        <Link className={styles.newCourse} href={canCreateCourse ? '/teacher/courses/new' : '/teacher/permission'}>
          {canCreateCourse ? 'New course' : 'Request teaching permission'}
        </Link>
        <details className={styles.filters}>
          <summary>Search &amp; sort</summary>
          <div>
            <label>
              <span>Search courses</span>
              <input type="search" placeholder="Search your courses" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span>Sort courses</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="title">Course title</option>
              </select>
            </label>
          </div>
        </details>
      </div>

      {!canCreateCourse ? (
        <section className={styles.notice}>
          <strong>Teaching permission is required</strong>
          <p>An Approver must approve your request before you can create a new course.</p>
          <Link href="/teacher/permission">Open permission request →</Link>
        </section>
      ) : null}

      <section className={styles.courses} aria-label="Your courses">
        {courses.map((course) => (
          <Link className={styles.course} href={`/teacher/courses/${course.id}`} key={course.id}>
            <div className={styles.artwork}><CourseArtwork /></div>
            <div className={styles.details}>
              <h2>{course.title}</h2>
              <div className={styles.metadata}>
                <strong>{course.status}</strong>
                <span>{data.find((item) => item.id === course.id)?.eligibilityMode === 'OPEN' ? 'Public' : 'Limited'}</span>
              </div>
            </div>
            <div className={styles.completion}>
              <span>{course.completion < 100 ? 'Finish your course' : 'Course ready'}</span>
              <div className={styles.progress} role="progressbar" aria-label={`${course.title} completion`} aria-valuenow={course.completion} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${course.completion}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {!courses.length ? (
        <section className={styles.empty}>
          <h2>{query ? 'No matching courses' : 'Create your first course'}</h2>
          <p>{query ? 'Try another title, category, status or language.' : 'Start a Draft, add the required assessments and submit it for review.'}</p>
          {!query && canCreateCourse ? <Link className={styles.newCourse} href="/teacher/courses/new">New course</Link> : null}
        </section>
      ) : null}
    </main>
  );
}
