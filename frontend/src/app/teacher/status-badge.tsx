import type { TeacherCourseStatus } from './teacher-data';
import { staffUi } from '../ui-styles';

const statusStyles: Record<TeacherCourseStatus, string> = {
  DRAFT: staffUi.statusDraft,
  SUBMITTED: staffUi.statusSubmitted,
  APPROVED: staffUi.statusPublished,
  PUBLISHED: staffUi.statusPublished,
  UNPUBLISHED: 'border-[#aeb5c0] bg-[#f1f3f5] text-[#566274]',
  REJECTED: staffUi.statusRejected,
};

export default function StatusBadge({ status }: { status: TeacherCourseStatus }) {
  return (
    <span className={`${staffUi.status} ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
