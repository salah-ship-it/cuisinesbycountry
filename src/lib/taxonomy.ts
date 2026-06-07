import taxonomyData from '../../data/taxonomy.json';

export type Recipe = {
  slug: string;
  name: string;
  description: string;
  prepTime: string;
  cookTime: string;
  difficulty: string;
  servings: number;
};

export type Category = {
  slug: string;
  name: string;
  recipes: Recipe[];
};

export type Cuisine = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  description: string;
  categories: Category[];
};

const taxonomy = taxonomyData as { cuisines: Cuisine[] };

export function getCuisines(): Cuisine[] {
  return taxonomy.cuisines;
}

export function getCuisine(slug: string): Cuisine | undefined {
  return taxonomy.cuisines.find((c) => c.slug === slug);
}

export function getCategory(
  cuisineSlug: string,
  categorySlug: string
): Category | undefined {
  return getCuisine(cuisineSlug)?.categories.find(
    (cat) => cat.slug === categorySlug
  );
}

export function getRecipe(
  cuisineSlug: string,
  categorySlug: string,
  recipeSlug: string
): Recipe | undefined {
  return getCategory(cuisineSlug, categorySlug)?.recipes.find(
    (r) => r.slug === recipeSlug
  );
}
