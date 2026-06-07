import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCuisine, getCuisines } from '@/lib/taxonomy';

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
};

type RecipeDetail = {
  ingredients: string[];
  instructions: string[];
  tips?: string[];
};

function getRecipeDetail(
  cuisineSlug: string,
  categorySlug: string,
  recipeSlug: string
): RecipeDetail | null {
  const filePath = path.join(
    process.cwd(),
    'data',
    'recipes',
    cuisineSlug,
    categorySlug,
    `${recipeSlug}.json`
  );
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as RecipeDetail;
}

function toIso8601Duration(timeStr: string): string {
  const hrMatch = timeStr.match(/(\d+)\s*hr/);
  const minMatch = timeStr.match(/(\d+)\s*min/);
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  if (hours === 0 && mins === 0) return 'PT0M';
  return `PT${hours > 0 ? `${hours}H` : ''}${mins > 0 ? `${mins}M` : ''}`;
}

export async function generateStaticParams() {
  return getCuisines().flatMap((cuisine) =>
    cuisine.categories.flatMap((cat) =>
      cat.recipes.map((recipe) => ({
        slug: cuisine.slug,
        category: cat.slug,
        recipe: recipe.slug,
      }))
    )
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category: string; recipe: string }>;
}): Promise<Metadata> {
  const { slug, category: categorySlug, recipe: recipeSlug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) return {};
  const category = cuisine.categories.find((c) => c.slug === categorySlug);
  if (!category) return {};
  const recipe = category.recipes.find((r) => r.slug === recipeSlug);
  if (!recipe) return {};

  const title = `${recipe.name} Recipe - Authentic ${cuisine.name}`;
  const description = `${recipe.description} Prep time: ${recipe.prepTime}, cook time: ${recipe.cookTime}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/cuisine/${cuisine.slug}/${category.slug}/${recipe.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/cuisine/${cuisine.slug}/${category.slug}/${recipe.slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string; category: string; recipe: string }>;
}) {
  const { slug, category: categorySlug, recipe: recipeSlug } = await params;
  const cuisine = getCuisine(slug);
  if (!cuisine) notFound();
  const category = cuisine.categories.find((c) => c.slug === categorySlug);
  if (!category) notFound();
  const recipe = category.recipes.find((r) => r.slug === recipeSlug);
  if (!recipe) notFound();

  const recipeDetail = getRecipeDetail(slug, categorySlug, recipeSlug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    prepTime: toIso8601Duration(recipe.prepTime),
    cookTime: toIso8601Duration(recipe.cookTime),
    recipeYield: `${recipe.servings} servings`,
    recipeCuisine: cuisine.name,
    recipeCategory: category.name,
    keywords: recipe.difficulty,
    ...(recipeDetail ? { recipeIngredient: recipeDetail.ingredients } : {}),
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="bg-gradient-to-br from-orange-800 via-orange-700 to-amber-600 text-white px-6 py-12">
        <div className="max-w-3xl mx-auto">
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
            <Link
              href={`/cuisine/${cuisine.slug}/${category.slug}`}
              className="hover:text-white transition-colors"
            >
              {category.name}
            </Link>
            <span className="text-orange-400">›</span>
            <span className="text-white">{recipe.name}</span>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-widest text-orange-300 mb-2">
            {cuisine.flag} {cuisine.name} · {category.name}
          </p>
          <h1 className="text-4xl font-bold leading-tight">{recipe.name}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Info bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-orange-100 px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
              Prep
            </p>
            <p className="font-semibold text-stone-800">{recipe.prepTime}</p>
          </div>
          <div className="rounded-xl bg-white border border-orange-100 px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
              Cook
            </p>
            <p className="font-semibold text-stone-800">{recipe.cookTime}</p>
          </div>
          <div className="rounded-xl bg-white border border-orange-100 px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
              Serves
            </p>
            <p className="font-semibold text-stone-800">{recipe.servings}</p>
          </div>
          <div className="rounded-xl bg-white border border-orange-100 px-4 py-4 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">
              Difficulty
            </p>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${DIFFICULTY_STYLES[recipe.difficulty] ?? 'bg-stone-100 text-stone-600'}`}
            >
              {recipe.difficulty}
            </span>
          </div>
        </div>

        {/* Description */}
        <section>
          <p className="text-stone-700 leading-relaxed text-base">
            {recipe.description}
          </p>
        </section>

        {/* Ingredients */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4">
            Ingredients
          </h2>
          {recipeDetail ? (
            <ul className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-sm space-y-2.5">
              {recipeDetail.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-stone-700 leading-relaxed"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
              <p className="text-stone-400 italic text-sm">
                Full ingredients list coming soon.
              </p>
            </div>
          )}
        </section>

        {/* Instructions */}
        <section>
          <h2 className="text-xl font-bold text-stone-800 mb-4">
            Instructions
          </h2>
          {recipeDetail ? (
            <ol className="space-y-3">
              {recipeDetail.instructions.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-sm"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {index + 1}
                  </span>
                  <p className="text-stone-700 leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
              <p className="text-stone-400 italic text-sm">
                Step-by-step instructions coming soon.
              </p>
            </div>
          )}
        </section>

        {/* Tips */}
        {recipeDetail?.tips && recipeDetail.tips.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
              <span aria-hidden="true">💡</span> Tips
            </h2>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5 shadow-sm space-y-3">
              {recipeDetail.tips.map((tip, index) => (
                <p
                  key={index}
                  className="flex items-start gap-2.5 text-stone-700 leading-relaxed text-sm"
                >
                  <span className="text-amber-500">•</span>
                  <span>{tip}</span>
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="pt-2">
          <Link
            href={`/cuisine/${cuisine.slug}/${category.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:text-orange-900 transition-colors"
          >
            ← Back to {category.name}
          </Link>
        </div>
      </main>
    </div>
  );
}
