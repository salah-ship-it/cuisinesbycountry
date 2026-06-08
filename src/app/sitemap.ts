import type { MetadataRoute } from 'next';
import { getCuisines } from '@/lib/taxonomy';

const SITE_URL = 'https://cuisinesbycountry.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const cuisines = getCuisines();

  const homeEntry: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const cuisineEntries: MetadataRoute.Sitemap = cuisines.map((cuisine) => ({
    url: `${SITE_URL}/cuisine/${cuisine.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = cuisines.flatMap((cuisine) =>
    cuisine.categories.map((category) => ({
      url: `${SITE_URL}/cuisine/${cuisine.slug}/${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  const recipeEntries: MetadataRoute.Sitemap = cuisines.flatMap((cuisine) =>
    cuisine.categories.flatMap((category) =>
      category.recipes.map((recipe) => ({
        url: `${SITE_URL}/cuisine/${cuisine.slug}/${category.slug}/${recipe.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
    )
  );

  return [...homeEntry, ...cuisineEntries, ...categoryEntries, ...recipeEntries];
}
