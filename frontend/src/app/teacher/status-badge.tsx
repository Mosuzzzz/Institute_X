import type { TeacherCourseStatus } from './teacher-data';

export default function StatusBadge({ status }: { status: TeacherCourseStatus }) {
  return (
    <span
      className={`teacher-status status-${status.toLowerCase()} ${status === 'UNPUBLISHED' ? 'border-[#aeb5c0] bg-[#f1f3f5] text-[#566274]' : ''}`}
    >
      {status}
    </span>
  );
}
