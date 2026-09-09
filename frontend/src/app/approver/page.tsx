'use client';

import Link from 'next/link';
import type { SubmittedVersionDto, TeacherPermissionDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { formatWaiting } from './approver-api';
import { staffUi } from '../ui-styles';
import BootstrapIcon from '../bootstrap-icon';

export default function ApproverOverviewPage() {
  const permissions = useBackendQuery<TeacherPermissionDto[]>('teacher-permissions/pending');
  const versions = useBackendQuery<SubmittedVersionDto[]>('course-versions/pending-review');

  if (!permissions.data || !versions.data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={permissions.loading || versions.loading} error={permissions.error ?? versions.error} />
      </main>
    );
  }

  const nextPermission = permissions.data[0];
  const nextVersion = versions.data[0];
  const totalPending = permissions.data.length + versions.data.length;

  return (
    <main className={staffUi.page}>
      {/* Header Section */}
      <header className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-teal-700 uppercase">
            <span className="size-2 rounded-full bg-teal-600 animate-pulse" />
            Institutional Governance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Review Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enforce quality standards, verify mandatory pre/post test requirements, and maintain two-person integrity.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-xs">
            <span className="size-2 rounded-full bg-teal-600" />
            {totalPending} decisions pending
          </span>
        </div>
      </header>

      {/* Queue Summary Cards */}
      <section aria-label="Review queue totals" className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Teacher Permissions Queue Card */}
        <Link
          href="/reviewing/teaching-requests"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold tracking-wide text-amber-700 uppercase">
                Queue 01
              </span>
              <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 group-hover:bg-teal-100">
                <BootstrapIcon name="people" className="text-xl" />
              </div>
            </div>
            <div className="my-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher Permissions</p>
              <strong className="mt-1 block text-4xl font-bold tracking-tight text-slate-900">
                {permissions.data.length} <span className="text-lg font-normal text-slate-500">pending</span>
              </strong>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <BootstrapIcon name="clock" className="text-sm text-slate-400" />
                Oldest waiting: {formatWaiting(nextPermission?.requestedAt ?? null)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700 group-hover:text-teal-800">
            <span>Open permission review queue</span>
            <BootstrapIcon name="arrow-right" className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Course Versions Queue Card */}
        <Link
          href="/reviewing/course-reviews"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold tracking-wide text-teal-700 uppercase">
                Queue 02
              </span>
              <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 group-hover:bg-teal-100">
                <BootstrapIcon name="book" className="text-xl" />
              </div>
            </div>
            <div className="my-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course Versions</p>
              <strong className="mt-1 block text-4xl font-bold tracking-tight text-slate-900">
                {versions.data.length} <span className="text-lg font-normal text-slate-500">pending</span>
              </strong>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <BootstrapIcon name="clock" className="text-sm text-slate-400" />
                Oldest waiting: {formatWaiting(nextVersion?.submittedAt ?? null)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-teal-700 group-hover:text-teal-800">
            <span>Open course submissions queue</span>
            <BootstrapIcon name="arrow-right" className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </section>

      {/* Prioritized Decision Worklist (Oldest First) */}
      <section aria-labelledby="worklist-heading" className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="worklist-heading" className="text-lg font-bold tracking-tight text-slate-900">
              Prioritized Decision Queue
            </h2>
            <p className="text-xs text-slate-500">Oldest submissions first to maintain institutional SLA</p>
          </div>
        </div>

        {totalPending > 0 ? (
          <div className="grid gap-3">
            {/* Top pending teacher permission */}
            {nextPermission ? (
              <Link
                href="/reviewing/teaching-requests"
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-600/20">
                    Teacher Request
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700">
                      {nextPermission.teacher?.fullName}
                    </h3>
                    <p className="text-xs text-slate-500">{nextPermission.teacher?.universityEmail}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Waiting {formatWaiting(nextPermission.requestedAt)}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:translate-x-1 transition-transform">
                    <span>Review Decision</span>
                    <BootstrapIcon name="arrow-right" />
                  </div>
                </div>
              </Link>
            ) : null}

            {/* Top pending course version */}
            {nextVersion ? (
              <Link
                href={`/reviewing/course-reviews/${nextVersion.id}`}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 ring-1 ring-teal-600/20">
                    Course V{nextVersion.versionNumber}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700">
                      {nextVersion.title}
                    </h3>
                    <p className="text-xs text-slate-500">Instructor: {nextVersion.course.teacher.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Waiting {formatWaiting(nextVersion.submittedAt)}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:translate-x-1 transition-transform">
                    <span>Inspect Course</span>
                    <BootstrapIcon name="arrow-right" />
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <div className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-600/20">
              <BootstrapIcon name="check-circle" className="text-3xl" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">All review queues are cleared!</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              There are currently no teacher permission requests or course version drafts waiting for approval.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
