import type { TeacherCourseStatus } from './teacher-data';

export default function StatusBadge({ status }: { status: TeacherCourseStatus }) {
  return <span className={`teacher-status status-${status.toLowerCase()}`}>{status}</span>;
}
