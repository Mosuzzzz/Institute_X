import CourseDetailClient from './course-detail-client';

export default async function TeacherCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseDetailClient courseId={courseId} />;
}
