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
import BootstrapIcon from '../../bootstrap-icon';

type SortOrder = 'newest' | 'oldest' | 'title';

function CourseArtwork() {
  return <BootstrapIcon name="collection-play" className="text-[84px] leading-none" />;
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
      <main data-ui="page" className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const canCreateCourse = permission.data?.status === 'APPROVED';

  return (
    <main data-ui="page" className={styles.page}>
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
          <Link href="/teacher/permission">Open permission request <BootstrapIcon name="arrow-right" /></Link>
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
