import CourseAnalyticsClient from './course-analytics-client';

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseAnalyticsClient courseId={courseId} />;
}
