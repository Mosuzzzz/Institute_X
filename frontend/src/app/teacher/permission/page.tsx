import { redirect } from 'next/navigation';

export default function RetiredTeacherPermissionPage() {
  redirect('/teacher/courses');
}
