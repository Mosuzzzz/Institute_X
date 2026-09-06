'use client';

import { type FormEvent, useState } from 'react';
import { backendApi, type CategoryDto } from '../../../lib/backend-api';
import { useBackendQuery } from '../../../lib/use-backend-query';
import ApiState from '../../api-state';
import { staffUi } from '../../ui-styles';

export default function OwnerCategoriesPage() {
  const { data, error, loading, refresh } = useBackendQuery<CategoryDto[]>('categories');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setMessage(null);
    try {
      await backendApi('categories', { method: 'POST', body: JSON.stringify({ slug: values.get('slug'), name: values.get('name') }) });
      form.reset();
      await refresh();
      setMessage('Category created.');
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Unable to create Category.');
    } finally {
      setSaving(false);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      await backendApi(`categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify({ slug: values.get('slug'), name: values.get('name') }) });
      await refresh();
      setMessage('Category updated. Catalog filters now use the new values.');
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Unable to update Category.');
    } finally {
      setSaving(false);
    }
  }

  if (!data) return <main className={staffUi.page}><ApiState loading={loading} error={error} /></main>;

  return (
    <main className={staffUi.page}>
      <header className={staffUi.heading}><div><p className={staffUi.eyebrow}>Reference data</p><h1>Course categories</h1><p>Create and rename the taxonomy used by Teacher authoring and Student catalog filters.</p></div></header>
      {message ? <p className="mt-5 border-l-4 border-[#073d78] bg-white p-4 text-sm">{message}</p> : null}
      <form className="mt-8 grid gap-3 border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_2fr_auto]" onSubmit={(event) => void create(event)}>
        <label className="grid gap-1 text-xs font-semibold">Slug<input className="min-h-11 border border-slate-300 px-3 text-sm" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
        <label className="grid gap-1 text-xs font-semibold">English database name<input className="min-h-11 border border-slate-300 px-3 text-sm" name="name" required /></label>
        <button className="min-h-11 self-end bg-[#073d78] px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={saving}>Add category</button>
      </form>
      <section className="mt-6 grid gap-3" aria-label="Existing categories">
        {data.map((category) => (
          <form className="grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto]" key={category.id} onSubmit={(event) => void update(event, category.id)}>
            <label className="grid gap-1 text-xs text-slate-500">Slug<input className="min-h-10 border border-slate-300 px-3 text-sm text-slate-900" defaultValue={category.slug} name="slug" required /></label>
            <label className="grid gap-1 text-xs text-slate-500">English database name<input className="min-h-10 border border-slate-300 px-3 text-sm text-slate-900" defaultValue={category.name} name="name" required /></label>
            <button className="min-h-10 self-end border border-[#073d78] px-4 text-sm font-semibold text-[#073d78] disabled:opacity-50" disabled={saving}>Save</button>
          </form>
        ))}
      </section>
    </main>
  );
}
