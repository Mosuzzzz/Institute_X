import CourseClient from './course-client';

export default async function CourseLearningPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseClient courseId={courseId} />;
}
