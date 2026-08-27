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
  const [eligibilityMode, setEligibilityMode] = useState<'OPEN' | 'LIMITED'>('OPEN');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!categories.data || !majors.data) return <main className="teacher-main teacher-form-page"><ApiState loading={categories.loading || majors.loading} error={categories.error ?? majors.error} /></main>;

  const submit = async (formData: FormData) => {
    setSaving(true); setError(null);
    try {
      const majorIds = eligibilityMode === 'OPEN' ? [] : formData.getAll('major');
      if (eligibilityMode === 'LIMITED' && majorIds.length === 0) {
        setError('Choose at least one eligible Major for a LIMITED Course.');
        setSaving(false);
        return;
      }
      const course = await backendApi<TeacherCourseDto>('courses', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          categoryIds: formData.getAll('category'),
          eligibilityMode,
          majorIds,
        }),
      });
      router.replace(`/teacher/courses/${course.id}`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create Course.'); setSaving(false); }
  };

  return <main className="teacher-main teacher-form-page"><header className="teacher-page-heading compact"><div><Link className="teacher-back-link" href="/teacher/courses">← My courses</Link><p className="eyebrow">New Draft</p><h1>Create a course</h1><p>Set the discovery and eligibility information for Version 1.</p></div></header><form className="teacher-form" action={(formData) => void submit(formData)}><section><header><span>01</span><div><h2>Course information</h2><p>Student-facing title and summary</p></div></header><label>Course title <input name="title" required maxLength={255} placeholder="e.g. Network Fundamentals" /></label><label>Description <textarea name="description" rows={5} maxLength={10000} placeholder="What will Students learn in this Course?" /></label></section><section><header><span>02</span><div><h2>Discovery</h2><p>Where the Course appears in the catalog</p></div></header><fieldset><legend>Categories</legend><div className="teacher-choice-grid">{categories.data.map((category) => <label key={category.id}><input type="checkbox" name="category" value={category.id} /> {translateCategory(category, language)}</label>)}</div></fieldset></section><section><header><span>03</span><div><h2>Student eligibility</h2><p>Choose who can access this Course</p></div></header><fieldset><legend>Access</legend><div className="grid grid-cols-2 border border-[#d7dce5] max-[600px]:grid-cols-1">{(['OPEN', 'LIMITED'] as const).map((mode) => <label className={`grid min-h-20 cursor-pointer grid-cols-[20px_1fr] items-center gap-3 px-4 py-3 transition-colors ${eligibilityMode === mode ? 'bg-[#e8eef5] text-[#073d78]' : 'bg-white hover:bg-[#f6f8fa]'}`} key={mode}><input className="h-[17px] w-[17px] accent-[#073d78]" type="radio" name="eligibilityMode" value={mode} checked={eligibilityMode === mode} onChange={() => { setEligibilityMode(mode); setError(null); }} /><span><strong className="block text-sm">{mode}</strong><small className="mt-1 block font-normal text-[#667182]">{mode === 'OPEN' ? 'All active Students can enter; no Major selection required.' : 'Only Students from selected Majors can enter.'}</small></span></label>)}</div></fieldset>{eligibilityMode === 'LIMITED' ? <fieldset className="mt-6"><legend>Eligible Majors</legend><div className="teacher-choice-grid">{majors.data.map((major) => <label key={major.id}><input type="checkbox" name="major" value={major.id} /> {translateMajor(major, language)} ({major.code})</label>)}</div></fieldset> : <p className="mt-5 text-sm text-[#667182]">No Major selection is needed for an OPEN Course.</p>}</section>{error ? <p className="form-help" role="alert">{error}</p> : null}<footer><Link href="/teacher/courses">Cancel</Link><button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Draft'}</button></footer></form></main>;
}
