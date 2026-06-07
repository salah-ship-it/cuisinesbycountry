import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCuisine, getCuisines } from '@/lib/taxonomy';

const CATEGORY_ICONS: Record<string, string> = {
  'Main Dishes': '🍽️',
  'Soups & Stews': '🥘',
  'Street Food': '🌮',
  'Desserts': '🍰',
  'Breakfast': '🌅',
  'Drinks': '🍵',
};

export async function generateStaticParams() {
  return getCuisines().map((cuisine) => ({ slug: cuisine.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) return {};

  const title = `${cuisine.name} Recipes - Traditional ${cuisine.country} Dishes`;

  return {
    title,
    description: cuisine.description,
    alternates: {
      canonical: `/cuisine/${cuisine.slug}`,
    },
    openGraph: {
      title,
      description: cuisine.description,
      url: `/cuisine/${cuisine.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: cuisine.description,
    },
  };
}

export default async function CuisinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) notFound();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-orange-800 via-orange-700 to-amber-600 text-white px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-orange-200 hover:text-white transition-colors mb-10"
          >
            ← All Cuisines
          </Link>

          <div className="flex items-center gap-6">
            <span className="text-8xl leading-none">{cuisine.flag}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-300 mb-2">
                {cuisine.country}
              </p>
              <h1 className="text-4xl font-bold leading-tight">
                {cuisine.name}
              </h1>
            </div>
          </div>

          <p className="mt-6 text-orange-100 leading-relaxed max-w-2xl text-base">
            {cuisine.description}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-6">
          6 Categories · 60 Recipes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuisine.categories.map((category) => (
            <Link
              key={category.slug}
              href={`/cuisine/${cuisine.slug}/${category.slug}`}
              className="group flex items-start gap-4 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              <span className="text-3xl leading-none mt-0.5">
                {CATEGORY_ICONS[category.name] ?? '🍴'}
              </span>
              <div>
                <h3 className="font-semibold text-stone-800 group-hover:text-orange-700 transition-colors">
                  {category.name}
                </h3>
                <p className="mt-1 text-sm text-stone-400">
                  {category.recipes.length} recipes
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
