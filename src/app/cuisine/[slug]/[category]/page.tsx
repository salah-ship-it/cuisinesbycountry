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

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
};

export async function generateStaticParams() {
  return getCuisines().flatMap((cuisine) =>
    cuisine.categories.map((cat) => ({
      slug: cuisine.slug,
      category: cat.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}): Promise<Metadata> {
  const { slug, category: categorySlug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) return {};
  const category = cuisine.categories.find((c) => c.slug === categorySlug);
  if (!category) return {};

  const title = `${category.name} - ${cuisine.name} Recipes`;
  const description = `Discover authentic ${cuisine.name} ${category.name.toLowerCase()} recipes with step-by-step instructions, prep times and difficulty levels.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/cuisine/${cuisine.slug}/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/cuisine/${cuisine.slug}/${category.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}) {
  const { slug, category: categorySlug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) notFound();
  const category = cuisine.categories.find((c) => c.slug === categorySlug);
  if (!category) notFound();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-gradient-to-br from-orange-800 via-orange-700 to-amber-600 text-white px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-orange-200 mb-8 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-orange-400">›</span>
            <Link
              href={`/cuisine/${cuisine.slug}`}
              className="hover:text-white transition-colors"
            >
              {cuisine.name}
            </Link>
            <span className="text-orange-400">›</span>
            <span className="text-white">{category.name}</span>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-5xl leading-none">
              {CATEGORY_ICONS[category.name] ?? '🍴'}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-300 mb-1">
                {cuisine.flag} {cuisine.name}
              </p>
              <h1 className="text-3xl font-bold">{category.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-6">
          {category.recipes.length} Recipes
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {category.recipes.map((recipe) => (
            <Link
              key={recipe.slug}
              href={`/cuisine/${cuisine.slug}/${category.slug}/${recipe.slug}`}
              className="group flex flex-col rounded-2xl border border-orange-100 bg-white p-6 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              <h2 className="font-semibold text-stone-800 text-lg leading-snug group-hover:text-orange-700 transition-colors">
                {recipe.name}
              </h2>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed line-clamp-2 flex-1">
                {recipe.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-stone-500">
                  <span>⏱</span>
                  <span>Prep {recipe.prepTime}</span>
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-500">
                  <span>🔥</span>
                  <span>Cook {recipe.cookTime}</span>
                </span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-500">
                  <span>🍽</span>
                  <span>Serves {recipe.servings}</span>
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 font-medium ${DIFFICULTY_STYLES[recipe.difficulty] ?? 'bg-stone-100 text-stone-600'}`}
                >
                  {recipe.difficulty}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
