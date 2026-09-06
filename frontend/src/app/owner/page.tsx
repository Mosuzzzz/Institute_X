'use client';

import Link from 'next/link';
import type { OwnerDashboardDto } from '../../lib/backend-api';
import { useBackendQuery } from '../../lib/use-backend-query';
import ApiState from '../api-state';
import { staffUi } from '../ui-styles';

export default function OwnerOverviewPage() {
  const { data, error, loading } = useBackendQuery<OwnerDashboardDto>('owner/dashboard');

  if (!data) {
    return (
      <main className={staffUi.page}>
        <ApiState loading={loading} error={error} />
      </main>
    );
  }

  const metrics = [
    {
      label: 'Active Users',
      value: data.overview.activeUsers,
      sublabel: `${data.overview.users.toLocaleString()} total registered`,
      accent: 'blue',
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
    },
    {
      label: 'Course Catalog',
      value: data.overview.courses,
      sublabel: 'All institutional courses',
      accent: 'indigo',
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
        </svg>
      ),
    },
    {
      label: 'Enrollments',
      value: data.overview.enrollments,
      sublabel: 'Student registrations',
      accent: 'emerald',
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'Learning Accesses',
      value: data.overview.accesses,
      sublabel: 'Lesson entries recorded',
      accent: 'amber',
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
      ),
    },
    {
      label: 'Assessment Attempts',
      value: data.overview.assessmentAttempts,
      sublabel: 'Pre & Post-tests taken',
      accent: 'teal',
      icon: (
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
        </svg>
      ),
    },
  ] as const;

  const maximumRoleUsers = Math.max(1, ...data.usersByRole.map((item) => item.users));
  const maximumVersions = Math.max(1, ...data.courseVersionsByStatus.map((item) => item.versions));
  const usageByHour = new Map(data.peakUsage.map((point) => [point.hour, point.accesses]));
  const usage = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    accesses: usageByHour.get(hour) ?? 0,
  }));
  const maxAccesses = Math.max(1, ...usage.map((point) => point.accesses));
  const peak = data.peakUsage.reduce(
    (best, point) => (point.accesses > best.accesses ? point : best),
    { hour: 0, accesses: 0 },
  );
  const decided = data.postTestResults.pass + data.postTestResults.notPass;
  const passRate = decided === 0 ? 0 : (data.postTestResults.pass / decided) * 100;

  return (
    <main className={staffUi.page}>
      {/* Header Banner */}
      <header className="mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-amber-700 uppercase">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            Live Institutional Telemetry
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Operational Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Platform throughput, learning engagement, and assessment quality indicators.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/owner/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Users Directory →
          </Link>
          <Link
            href="/owner/operations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            Operations →
          </Link>
        </div>
      </header>

      {/* 5-Metric KPI Strip */}
      <section aria-label="Platform Key Performance Indicators" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[0.68rem] font-bold tracking-wider uppercase text-slate-500">
                {metric.label}
              </span>
              <div className="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200/60 group-hover:bg-blue-50 group-hover:text-blue-600">
                {metric.icon}
              </div>
            </div>
            <div className="my-3">
              <strong className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">
                {metric.value.toLocaleString()}
              </strong>
              <p className="mt-1 text-xs text-slate-500">{metric.sublabel}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Interactive Visual Analytics Grid */}
      <section aria-label="Platform telemetry charts" className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hourly Peak Usage Chart (2 Columns Wide) */}
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">Traffic & Demand</span>
              <h2 className="text-base font-bold text-slate-900">Hourly Platform Accesses</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
              Peak: {peak.hour}:00 ({peak.accesses.toLocaleString()} accesses)
            </span>
          </div>

          <div className="mt-8 flex h-52 items-end gap-1.5 border-b border-slate-200 pb-2">
            {usage.map((point) => {
              const heightPct =
                point.accesses === 0
                  ? 0
                  : Math.max(8, (point.accesses / maxAccesses) * 100);
              const isPeak = point.hour === peak.hour;
              return (
                <div
                  key={point.hour}
                  className="group relative flex flex-1 flex-col items-center justify-end h-full"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isPeak
                        ? 'bg-gradient-to-t from-amber-500 to-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-slate-200 group-hover:bg-blue-500'
                    }`}
                  />
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[0.65rem] font-bold text-white shadow-md group-hover:block">
                    {point.hour}:00 — {point.accesses}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-[0.65rem] font-semibold text-slate-400">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:00</span>
          </div>
        </article>

        {/* Assessment Outcomes Card (1 Column Wide) */}
        <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div>
            <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">Quality Benchmark</span>
            <h2 className="text-base font-bold text-slate-900">Post-Test Passing Rate</h2>
            <p className="mt-1 text-xs text-slate-500">Students must score ≥ 80% to achieve PASS status</p>
          </div>

          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative grid size-36 place-items-center rounded-full bg-gradient-to-tr from-emerald-50 to-teal-50 ring-8 ring-emerald-500/10">
              <div className="text-center">
                <strong className="block text-3xl font-extrabold tracking-tight text-emerald-700">
                  {passRate.toFixed(1)}%
                </strong>
                <span className="text-[0.65rem] font-bold tracking-wider uppercase text-slate-500">
                  Passing Rate
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center">
            <div className="rounded-xl bg-emerald-50/60 p-2.5">
              <strong className="block text-lg font-bold text-emerald-800">
                {data.postTestResults.pass.toLocaleString()}
              </strong>
              <span className="text-[0.68rem] font-semibold text-emerald-700">Passed (≥80%)</span>
            </div>
            <div className="rounded-xl bg-rose-50/60 p-2.5">
              <strong className="block text-lg font-bold text-rose-800">
                {data.postTestResults.notPass.toLocaleString()}
              </strong>
              <span className="text-[0.68rem] font-semibold text-rose-700">Retake Needed</span>
            </div>
          </div>
        </article>
      </section>

      {/* Distribution Breakdowns Grid */}
      <section aria-label="Platform distributions" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Users by Role */}
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Account Distribution by Role</h2>
              <p className="text-xs text-slate-500">Total institutional profiles</p>
            </div>
            <Link href="/owner/users" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage →
            </Link>
          </div>
          <div className="grid gap-3.5">
            {data.usersByRole.map((item) => (
              <div key={item.role} className="grid grid-cols-[85px_minmax(0,1fr)_44px] items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">{item.role}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(item.users / maximumRoleUsers) * 100}%` }}
                  />
                </div>
                <strong className="text-right text-xs font-bold text-slate-800">{item.users}</strong>
              </div>
            ))}
          </div>
        </article>

        {/* Course Versions by Status */}
        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Publishing Pipeline Status</h2>
              <p className="text-xs text-slate-500">
                {data.overview.pendingTeacherPermissions} teacher permissions pending
              </p>
            </div>
            <Link href="/owner/courses" className="text-xs font-semibold text-amber-700 hover:underline">
              Moderation →
            </Link>
          </div>
          <div className="grid gap-3.5">
            {data.courseVersionsByStatus.map((item) => (
              <div key={item.status} className="grid grid-cols-[95px_minmax(0,1fr)_44px] items-center gap-3">
                <span className="text-xs font-semibold text-slate-600">{item.status}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(item.versions / maximumVersions) * 100}%` }}
                  />
                </div>
                <strong className="text-right text-xs font-bold text-slate-800">{item.versions}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
