import type { TeacherCourseStatus } from './teacher-data';

const statusConfig: Record<
  TeacherCourseStatus,
  { bg: string; text: string; ring: string; dot: string; label?: string }
> = {
  DRAFT: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    dot: 'bg-amber-500',
    label: 'Draft',
  },
  SUBMITTED: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-600/20',
    dot: 'bg-sky-500 animate-pulse',
    label: 'In Review',
  },
  APPROVED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
    dot: 'bg-emerald-500',
    label: 'Approved',
  },
  PUBLISHED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
    dot: 'bg-emerald-500',
    label: 'Published',
  },
  UNPUBLISHED: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-500/20',
    dot: 'bg-slate-400',
    label: 'Unpublished',
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-600/20',
    dot: 'bg-rose-500',
    label: 'Needs Work',
  },
};

export default function StatusBadge({ status }: { status: TeacherCourseStatus }) {
  const config = statusConfig[status] ?? {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-500/20',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label ?? status}
    </span>
  );
}
