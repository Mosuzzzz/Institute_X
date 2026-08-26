import StudentCatalogClient from '../student-catalog-client';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q } = await searchParams;
  return <StudentCatalogClient mode="catalog" category={category} query={q} />;
}
