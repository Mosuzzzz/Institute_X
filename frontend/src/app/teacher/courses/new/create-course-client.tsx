'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { backendApi, type CategoryDto, type MajorDto, type TeacherCourseDto } from '../../../../lib/backend-api';
import { useBackendQuery } from '../../../../lib/use-backend-query';
import { useAppLanguage } from '../../../../lib/language';
import { translateCategory, translateMajor } from '../../../../lib/reference-translations';
import ApiState from '../../../api-state';

export default function CreateCourseClient() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const categories = useBackendQuery<CategoryDto[]>('categories');
  const majors = useBackendQuery<MajorDto[]>('majors');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!categories.data || !majors.data) return <main className="teacher-main teacher-form-page"><ApiState loading={categories.loading || majors.loading} error={categories.error ?? majors.error} /></main>;

  const submit = async (formData: FormData) => {
    setSaving(true); setError(null);
    try {
      const course = await backendApi<TeacherCourseDto>('courses', { method: 'POST', body: JSON.stringify({ title: formData.get('title'), description: formData.get('description'), categoryIds: formData.getAll('category'), majorIds: formData.getAll('major') }) });
      router.replace(`/teacher/courses/${course.id}`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create Course.'); setSaving(false); }
  };

  return <main className="teacher-main teacher-form-page"><header className="teacher-page-heading compact"><div><Link className="teacher-back-link" href="/teacher/courses">← My courses</Link><p className="eyebrow">New Draft</p><h1>Create a course</h1><p>Set the discovery and eligibility information for Version 1.</p></div></header><form className="teacher-form" action={(formData) => void submit(formData)}><section><header><span>01</span><div><h2>Course information</h2><p>Student-facing title and summary</p></div></header><label>Course title <input name="title" required maxLength={255} placeholder="e.g. Network Fundamentals" /></label><label>Description <textarea name="description" rows={5} maxLength={10000} placeholder="What will Students learn in this Course?" /></label></section><section><header><span>02</span><div><h2>Discovery</h2><p>Where the Course appears in the catalog</p></div></header><fieldset><legend>Categories</legend><div className="teacher-choice-grid">{categories.data.map((category) => <label key={category.id}><input type="checkbox" name="category" value={category.id} /> {translateCategory(category, language)}</label>)}</div></fieldset></section><section><header><span>03</span><div><h2>Student eligibility</h2><p>Choose one or more eligible Majors</p></div></header><fieldset><legend>Eligible Majors</legend><div className="teacher-choice-grid">{majors.data.map((major) => <label key={major.id}><input type="checkbox" name="major" value={major.id} /> {translateMajor(major, language)} ({major.code})</label>)}</div></fieldset></section>{error ? <p className="form-help" role="alert">{error}</p> : null}<footer><Link href="/teacher/courses">Cancel</Link><button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Draft'}</button></footer></form></main>;
}
