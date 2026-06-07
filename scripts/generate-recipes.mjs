import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAXONOMY_PATH = path.join(__dirname, '..', 'data', 'taxonomy.json');
const OUTPUT_ROOT = path.join(__dirname, '..', 'data', 'recipes');

// ---------------------------------------------------------------------------
// CLI args: --start <index> --end <index> (both inclusive, over the full
// flattened list of recipes in taxonomy order)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  let start = 0;
  let end = Infinity;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--start') start = parseInt(argv[++i], 10);
    if (argv[i] === '--end') end = parseInt(argv[++i], 10);
  }
  return { start, end };
}

// ---------------------------------------------------------------------------
// Deterministic RNG — seeded from the recipe's full slug path so re-running
// the script (or running overlapping --start/--end ranges) always produces
// the exact same content for a given recipe.
// ---------------------------------------------------------------------------

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedString) {
  return mulberry32(seedFromString(seedString));
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickDistinct(rng, arr, count) {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Cuisine pantries — the realistic ingredient vocabulary each cuisine draws
// from. The generator combines these with cuisine/category-aware templates
// to build a contextually appropriate ingredient list and instructions for
// every recipe.
// ---------------------------------------------------------------------------

const PANTRY = {
  moroccan: {
    proteins: ['chicken thighs', 'lamb shoulder', 'lamb shanks', 'ground beef', 'merguez sausage', 'chickpeas', 'white fish fillets'],
    staples: ['couscous', 'crusty bread', 'flatbread', 'vermicelli noodles'],
    vegetables: ['carrots', 'zucchini', 'red onions', 'ripe tomatoes', 'red bell peppers', 'potatoes', 'butternut squash'],
    aromatics: ['minced garlic', 'grated fresh ginger', 'sliced shallots', 'finely chopped red onion'],
    spices: ['ground cumin', 'ground cinnamon', 'sweet paprika', 'ground ginger', 'saffron threads', 'ras el hanout', 'ground turmeric', 'harissa paste'],
    herbs: ['cilantro', 'parsley', 'mint'],
    finishing: ['preserved lemon', 'green olives', 'toasted almonds', 'dried apricots', 'honey', 'orange blossom water', 'pitted dates'],
    fats: ['olive oil', 'butter', 'smen (preserved butter)'],
    liquids: ['chicken stock', 'vegetable stock', 'water'],
  },
  italian: {
    proteins: ['guanciale', 'ground beef', 'ground pork', 'chicken thighs', 'fresh mozzarella', 'sea bass fillets', 'pancetta', 'Italian sausage'],
    staples: ['spaghetti', 'arborio rice', 'pizza dough', 'ladyfingers', 'fresh lasagna sheets', 'ciabatta bread'],
    vegetables: ['San Marzano tomatoes', 'yellow onions', 'celery stalks', 'carrots', 'baby spinach', 'zucchini', 'eggplant'],
    aromatics: ['minced garlic', 'sliced shallots', 'sliced leeks'],
    spices: ['dried oregano', 'red pepper flakes', 'cracked black pepper', 'fennel seeds', 'grated nutmeg'],
    herbs: ['basil', 'parsley', 'sage', 'rosemary'],
    finishing: ['Parmesan cheese', 'mascarpone', 'extra-virgin olive oil', 'balsamic vinegar', 'pine nuts', 'lemon zest'],
    fats: ['extra-virgin olive oil', 'unsalted butter'],
    liquids: ['chicken stock', 'dry white wine', 'whole milk', 'vegetable stock'],
  },
  japanese: {
    proteins: ['chicken thighs', 'pork loin', 'fresh salmon fillets', 'sushi-grade tuna', 'firm tofu', 'thinly sliced beef', 'large prawns'],
    staples: ['short-grain rice', 'ramen noodles', 'soba noodles', 'panko breadcrumbs', 'nori sheets'],
    vegetables: ['napa cabbage', 'daikon radish', 'shiitake mushrooms', 'scallions', 'bean sprouts', 'carrots'],
    aromatics: ['minced garlic', 'grated fresh ginger', 'sliced scallion whites'],
    spices: ['shichimi togarashi', 'white sesame seeds', 'cracked black pepper', 'wasabi paste'],
    herbs: ['shiso leaves', 'chives', 'mitsuba'],
    finishing: ['soy sauce', 'mirin', 'sake', 'toasted sesame oil', 'pickled ginger', 'bonito flakes'],
    fats: ['neutral vegetable oil', 'toasted sesame oil'],
    liquids: ['dashi stock', 'chicken stock', 'water'],
  },
  indian: {
    proteins: ['chicken thighs', 'paneer cubes', 'lamb shoulder', 'red lentils', 'chickpeas', 'basmati rice', 'large prawns'],
    staples: ['basmati rice', 'naan bread', 'roti', 'semolina', 'flattened rice (poha)', 'idli batter'],
    vegetables: ['ripe tomatoes', 'yellow onions', 'fresh spinach', 'potatoes', 'green chilies', 'cauliflower florets'],
    aromatics: ['minced garlic', 'grated fresh ginger', 'crushed green cardamom pods', 'curry leaves'],
    spices: ['garam masala', 'ground turmeric', 'ground cumin', 'ground coriander', 'mustard seeds', 'red chili powder', 'dried fenugreek leaves'],
    herbs: ['cilantro', 'mint', 'curry leaves'],
    finishing: ['ghee', 'plain yogurt', 'heavy cream', 'tamarind paste', 'lemon wedges', 'roasted cashews'],
    fats: ['ghee', 'neutral vegetable oil'],
    liquids: ['chicken stock', 'coconut milk', 'water', 'whole milk'],
  },
  mexican: {
    proteins: ['pork shoulder', 'chicken thighs', 'ground beef', 'black beans', 'white fish fillets', 'cured chorizo'],
    staples: ['corn tortillas', 'white rice', 'pinto beans', 'masa dough', 'bolillo rolls'],
    vegetables: ['ripe tomatoes', 'white onions', 'jalapeños', 'avocado', 'tomatillos', 'red bell peppers'],
    aromatics: ['minced garlic', 'finely chopped white onion', 'rehydrated dried chilies'],
    spices: ['ground cumin', 'smoked paprika', 'dried oregano', 'ground cinnamon', 'chili powder'],
    herbs: ['cilantro', 'epazote', 'oregano'],
    finishing: ['lime wedges', 'crumbled cotija cheese', 'Mexican crema', 'pickled red onions', 'toasted pumpkin seeds', 'salsa verde'],
    fats: ['lard', 'neutral vegetable oil', 'olive oil'],
    liquids: ['chicken stock', 'beef stock', 'water', 'orange juice'],
  },
  turkish: {
    proteins: ['ground lamb', 'lamb shoulder', 'chicken thighs', 'red lentils', 'fresh mussels', 'beef sirloin'],
    staples: ['pide bread', 'bulgur wheat', 'rice pilaf', 'yufka pastry', 'simit rings'],
    vegetables: ['ripe tomatoes', 'green peppers', 'red onions', 'eggplant', 'cucumber', 'baby potatoes'],
    aromatics: ['minced garlic', 'finely chopped red onion', 'sliced scallions'],
    spices: ['ground cumin', 'sweet paprika', 'dried mint', 'Aleppo pepper', 'ground sumac', 'cracked black pepper'],
    herbs: ['parsley', 'dill', 'mint'],
    finishing: ['lemon wedges', 'plain yogurt', 'pomegranate molasses', 'toasted pine nuts', 'crumbled feta', 'butter-fried pita'],
    fats: ['olive oil', 'unsalted butter'],
    liquids: ['chicken stock', 'beef stock', 'water'],
  },
  french: {
    proteins: ['beef chuck', 'chicken thighs', 'duck legs', 'pork lardons', 'fresh mussels', 'sea bass fillets'],
    staples: ['baguette', 'puff pastry', 'brioche', 'arborio rice', 'egg noodles'],
    vegetables: ['pearl onions', 'carrots', 'leeks', 'button mushrooms', 'shallots', 'celery stalks', 'ripe tomatoes'],
    aromatics: ['minced garlic', 'sliced shallots', 'sliced leeks'],
    spices: ['bay leaves', 'fresh thyme', 'cracked black peppercorns', 'herbes de Provence', 'grated nutmeg'],
    herbs: ['tarragon', 'chervil', 'parsley', 'chives'],
    finishing: ['Dijon mustard', 'crème fraîche', 'Gruyère cheese', 'lemon zest', 'unsalted butter', 'cognac'],
    fats: ['unsalted butter', 'extra-virgin olive oil'],
    liquids: ['dry red wine', 'chicken stock', 'beef stock', 'whole milk', 'dry white wine'],
  },
  thai: {
    proteins: ['chicken thighs', 'large prawns', 'pork shoulder', 'firm tofu', 'beef sirloin', 'white fish fillets'],
    staples: ['jasmine rice', 'rice noodles', 'glutinous rice', 'rice vermicelli', 'roti dough'],
    vegetables: ['Thai bird\'s eye chilies', 'cherry tomatoes', 'Thai eggplant', 'bean sprouts', 'snake beans', 'baby corn'],
    aromatics: ['minced garlic', 'sliced lemongrass', 'sliced galangal', 'sliced shallots', 'torn kaffir lime leaves'],
    spices: ['white pepper', 'ground turmeric', 'red curry paste', 'dried shrimp', 'palm sugar'],
    herbs: ['Thai basil', 'cilantro', 'mint'],
    finishing: ['fish sauce', 'lime wedges', 'roasted peanuts', 'coconut cream', 'tamarind paste', 'crispy fried shallots'],
    fats: ['coconut oil', 'neutral vegetable oil'],
    liquids: ['coconut milk', 'chicken stock', 'water', 'tamarind water'],
  },
  chinese: {
    proteins: ['chicken thighs', 'pork belly', 'ground pork', 'large prawns', 'firm tofu', 'beef sirloin', 'whole duck'],
    staples: ['jasmine rice', 'egg noodles', 'wonton wrappers', 'steamed buns', 'glutinous rice'],
    vegetables: ['napa cabbage', 'scallions', 'shiitake mushrooms', 'bok choy', 'bamboo shoots', 'bean sprouts', 'carrots'],
    aromatics: ['minced garlic', 'grated fresh ginger', 'sliced scallion whites', 'crushed Sichuan peppercorns'],
    spices: ['five-spice powder', 'white pepper', 'chili oil', 'doubanjiang (chili bean paste)', 'star anise'],
    herbs: ['cilantro', 'scallion greens', 'chives'],
    finishing: ['soy sauce', 'Shaoxing wine', 'oyster sauce', 'toasted sesame oil', 'black vinegar', 'toasted sesame seeds'],
    fats: ['neutral vegetable oil', 'toasted sesame oil'],
    liquids: ['chicken stock', 'water', 'pork stock'],
  },
  indonesian: {
    proteins: ['chicken thighs', 'beef shin', 'large prawns', 'firm tofu', 'tempeh', 'whole mackerel'],
    staples: ['jasmine rice', 'rice noodles', 'compressed rice cakes (lontong)', 'fried shallot crackers (krupuk)'],
    vegetables: ['long beans', 'cabbage', 'bean sprouts', 'cherry tomatoes', 'shallots', 'chayote'],
    aromatics: ['minced garlic', 'sliced shallots', 'grated fresh ginger', 'sliced galangal', 'sliced lemongrass'],
    spices: ['ground turmeric', 'coriander seeds', 'crushed candlenuts', 'ground cumin', 'palm sugar', 'tamarind paste'],
    herbs: ['cilantro', 'kaffir lime leaves', 'Thai basil'],
    finishing: ['kecap manis (sweet soy sauce)', 'sambal', 'crispy fried shallots', 'roasted peanuts', 'lime wedges', 'coconut cream'],
    fats: ['coconut oil', 'neutral vegetable oil'],
    liquids: ['coconut milk', 'chicken stock', 'water', 'tamarind water'],
  },
};

const TYPE_TO_BANK = {
  protein: 'proteins',
  staple: 'staples',
  vegetable: 'vegetables',
  aromatic: 'aromatics',
  spice: 'spices',
  herb: 'herbs',
  finishing: 'finishing',
  fat: 'fats',
  liquid: 'liquids',
};

function quantify(rng, type, item) {
  switch (type) {
    case 'protein':
      return `${pick(rng, ['400g', '500g', '600g', '700g', '1 kg'])} ${item}`;
    case 'staple':
      return `${pick(rng, ['1 cup', '2 cups', '300g', '400g'])} ${item}`;
    case 'vegetable':
      return pick(rng, [
        `2 ${item}, chopped`,
        `1 cup ${item}, sliced`,
        `a generous handful of ${item}`,
        `200g ${item}`,
      ]);
    case 'aromatic':
      return `${pick(rng, ['1 tbsp', '2 tbsp', '2 tsp', 'a handful of'])} ${item}`;
    case 'spice':
      return `${pick(rng, ['1/2 tsp', '1 tsp', '1 1/2 tsp', '2 tsp', 'a pinch of'])} ${item}`;
    case 'herb':
      return `a handful of fresh ${item}, chopped`;
    case 'finishing':
      return pick(rng, [
        `${item}, to taste`,
        `${item}, for serving`,
        `a generous spoonful of ${item}`,
        `a drizzle of ${item}`,
      ]);
    case 'fat':
      return `${pick(rng, ['2 tbsp', '3 tbsp', '1/4 cup'])} ${item}`;
    case 'liquid':
      return `${pick(rng, ['1 cup', '2 cups', '400ml', '500ml'])} ${item}`;
    default:
      return item;
  }
}

function buildIngredients(rng, pantry) {
  const count = randInt(rng, 8, 12);
  const order = [
    'protein', 'staple', 'aromatic', 'spice', 'fat',
    'vegetable', 'herb', 'finishing', 'liquid',
    'spice', 'vegetable', 'finishing',
  ];
  const used = new Set();
  const ingredients = [];

  for (const type of order) {
    if (ingredients.length >= count) break;
    const bank = pantry[TYPE_TO_BANK[type]];
    const candidates = bank.filter((item) => !used.has(item));
    if (!candidates.length) continue;
    const item = pick(rng, candidates);
    used.add(item);
    ingredients.push(quantify(rng, type, item));
  }

  let guard = 0;
  const types = Object.keys(TYPE_TO_BANK);
  while (ingredients.length < count && guard < 60) {
    const type = pick(rng, types);
    const bank = pantry[TYPE_TO_BANK[type]];
    const candidates = bank.filter((item) => !used.has(item));
    if (candidates.length) {
      const item = pick(rng, candidates);
      used.add(item);
      ingredients.push(quantify(rng, type, item));
    }
    guard++;
  }

  return ingredients;
}

// ---------------------------------------------------------------------------
// Instruction & tip templates, grouped by the six shared category types.
// Placeholders are filled from a per-recipe "slots" object built from the
// cuisine's pantry, so every recipe gets a personalized but coherent flow.
// ---------------------------------------------------------------------------

const CATEGORY_TYPE_BY_NAME = {
  'Main Dishes': 'main',
  'Soups & Stews': 'soup',
  'Street Food': 'street',
  'Desserts': 'dessert',
  'Breakfast': 'breakfast',
  'Drinks': 'drink',
};

const INSTRUCTION_TEMPLATES = {
  main: [
    'Pat the {protein} dry, season generously with salt, pepper, and {spice}, and let it sit for a few minutes to absorb the flavors.',
    'Heat {fat} in a wide pan or heavy pot over medium-high heat and sear the {protein} until browned on all sides, then remove and set aside.',
    'In the same pan, gently cook the {aromatic} and {aromatic2} over medium heat until softened and fragrant, about 4-5 minutes.',
    'Stir in the {spice2} and {vegetable}, cooking for a few more minutes so the spices bloom and coat the vegetables.',
    'Return the {protein} to the pan, pour in the {liquid}, and bring everything to a gentle simmer.',
    'Cover and cook over low heat until the {protein} is tender and cooked through, roughly {cookTime}.',
    'Stir in the {finishing}, taste, and adjust the seasoning with salt and pepper as needed.',
    'Scatter over the {herb} and serve hot alongside {staple}.',
  ],
  soup: [
    'Heat {fat} in a large pot over medium heat and cook the {aromatic} and {aromatic2} gently until soft and fragrant.',
    'Stir in the {spice} and {spice2}, toasting briefly until the kitchen fills with their aroma.',
    'Add the {protein} and {vegetable}, stirring well to coat everything in the spiced base.',
    'Pour in the {liquid}, scraping up any browned bits from the bottom of the pot, and bring to a boil.',
    'Reduce the heat, cover, and let everything simmer gently until the {protein} is tender, about {cookTime}.',
    'Stir in the {staple} and continue simmering for a few minutes more, until heated through.',
    'Finish with the {finishing} and adjust the seasoning to taste.',
    'Ladle into bowls, scatter over the {herb}, and serve piping hot.',
  ],
  street: [
    'Prepare the {staple} base and set it aside to rest while you get the filling ready.',
    'In a bowl, combine the {protein}, {vegetable}, {aromatic}, and {spice}, mixing well so everything is evenly seasoned.',
    'Heat {fat} in a skillet, wok, or on a griddle over medium-high heat until shimmering.',
    'Cook the {staple} until lightly golden on each side, then transfer to a warm plate.',
    'Fry, grill, or steam the {protein} mixture until cooked through and lightly charred at the edges, about {cookTime}.',
    'Assemble by layering the {staple} with the filling, a spoonful of {finishing}, and a scattering of {herb}.',
    'Add a final touch of {finishing2} for extra flavor and texture.',
    'Serve immediately while hot, with extra {finishing} on the side for dipping or drizzling.',
  ],
  dessert: [
    'Preheat your oven (or set up your steamer or frying station) and lightly grease your pan or molds with {fat}.',
    'In a large bowl, whisk together the {staple} and {spice} until evenly combined.',
    'In a separate bowl, blend the {finishing} with the {liquid} until smooth and well incorporated.',
    'Gently fold the wet mixture into the dry ingredients, taking care not to overmix.',
    'Transfer everything to your prepared pan or molds and cook — bake, steam, chill, or fry — until set, about {cookTime}.',
    'Remove from the heat and let it cool completely; this helps the texture firm up perfectly.',
    'Garnish with {herb} or a dusting of {finishing2}.',
    'Slice or portion into servings and serve.',
  ],
  breakfast: [
    'Gather and prep the {staple} and {protein}, measuring everything out so it is ready to go.',
    'Heat {fat} in a non-stick pan over medium heat until warm but not smoking.',
    'Add the {aromatic} and {vegetable}, cooking gently until softened, about 3-4 minutes.',
    'Stir in the {protein}, season with {spice}, and cook until just done, about {cookTime}.',
    'Warm the {staple} alongside, turning once, until heated through and lightly toasted.',
    'Plate the {staple} and spoon the cooked mixture over the top.',
    'Drizzle with {finishing} and finish with a sprinkle of {herb}.',
    'Serve immediately while everything is warm.',
  ],
  drink: [
    'Combine the {staple} and {liquid} in a saucepan, blender, or pitcher, stirring well.',
    'Add the {spice} and {finishing}, stirring gently so their flavor infuses the mixture.',
    'Heat gently over low heat (or blend, or steep, depending on the drink) until well combined and fragrant, about {cookTime}.',
    'Strain through a fine sieve to remove any solids, if needed.',
    'Sweeten to taste with {finishing2}, adjusting gradually until the balance feels right.',
    'Chill in the refrigerator, or pour straight over ice, depending on whether it is served cold or hot.',
    'Garnish with {herb} just before serving.',
    'Pour into your favorite glass or cup and enjoy.',
  ],
};

const TIP_TEMPLATES = {
  main: [
    'For deeper flavor, marinate the {protein} for at least an hour — or overnight — before cooking.',
    'Avoid crowding the pan when searing the {protein}; work in batches so it browns instead of steaming.',
    'Leftovers taste even better the next day once the spices have had time to mingle — reheat gently over low heat.',
    'A squeeze of lemon or a final scattering of {herb} just before serving brightens up all the deep, slow-cooked flavors.',
  ],
  soup: [
    'Skim off any foam that rises during the first few minutes of simmering for a clearer, cleaner broth.',
    'Letting the pot rest for 10 minutes off the heat allows the flavors to deepen before serving.',
    'Taste and adjust the seasoning right at the end — the {liquid} reduces as it simmers, concentrating the flavor.',
    'This freezes well; portion into containers and reheat gently on the stovetop for a quick meal later.',
  ],
  street: [
    'Keep the {fat} hot but not smoking — a thermometer helps you nail the perfect frying or grilling temperature.',
    'Prep all your fillings and toppings before you start cooking, since this dish comes together quickly once the heat is on.',
    'Serve immediately for the best contrast between a crisp exterior and a warm, tender filling.',
    'Double the {finishing} so you have plenty for dipping — it tends to disappear fast.',
  ],
  dessert: [
    'Bring your {finishing} to room temperature before mixing for a smoother, more even texture.',
    'Resist opening the oven door too early — a sudden change in temperature can cause the dessert to sink or crack.',
    'This keeps well for a couple of days in an airtight container, and the flavor often improves overnight.',
    'For the cleanest slices, chill the finished dessert thoroughly before cutting.',
  ],
  breakfast: [
    'Prep the {staple} and {protein} the night before to make busy mornings much easier.',
    'Keep the heat moderate so the {protein} cooks through gently without drying out or turning rubbery.',
    'A squeeze of citrus or a sprinkle of {herb} just before serving brightens up the whole plate.',
    'Make a double batch — leftovers reheat beautifully for a quick weekday breakfast.',
  ],
  drink: [
    'Adjust the sweetness gradually, tasting as you go — you can always add more {finishing2}, but you cannot take it away.',
    'Serve in a chilled glass for the most refreshing result on a hot day.',
    'If serving warm, gently reheat just before pouring rather than letting it come to a boil.',
    'Make a big batch and keep it chilled in the fridge — the flavor often deepens after a few hours.',
  ],
};

function fillTemplate(template, slots) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in slots ? slots[key] : `{${key}}`));
}

function buildSlots(rng, pantry, recipe) {
  const [aromatic, aromatic2] = pickDistinct(rng, pantry.aromatics, 2);
  const [spice, spice2] = pickDistinct(rng, pantry.spices, 2);
  const [finishing, finishing2] = pickDistinct(rng, pantry.finishing, 2);
  const [vegetable] = pickDistinct(rng, pantry.vegetables, 1);

  return {
    recipeName: recipe.name,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: String(recipe.servings),
    protein: pick(rng, pantry.proteins),
    staple: pick(rng, pantry.staples),
    vegetable,
    aromatic,
    aromatic2: aromatic2 || aromatic,
    spice,
    spice2: spice2 || spice,
    herb: pick(rng, pantry.herbs),
    finishing,
    finishing2: finishing2 || finishing,
    fat: pick(rng, pantry.fats),
    liquid: pick(rng, pantry.liquids),
  };
}

function buildInstructions(rng, categoryType, slots) {
  const templates = INSTRUCTION_TEMPLATES[categoryType];
  const stepCount = randInt(rng, 6, 8);
  const trimmed = stepCount === templates.length
    ? templates
    : templates.slice(0, stepCount);
  return trimmed.map((template) => fillTemplate(template, slots));
}

function buildTips(rng, categoryType, slots) {
  const templates = TIP_TEMPLATES[categoryType];
  const tipCount = randInt(rng, 2, 3);
  const chosen = pickDistinct(rng, templates, tipCount);
  return chosen.map((template) => fillTemplate(template, slots));
}

function buildRecipeContent(cuisine, category, recipe) {
  const seed = `${cuisine.slug}/${category.slug}/${recipe.slug}`;
  const rng = createRng(seed);
  const pantry = PANTRY[cuisine.slug];
  const categoryType = CATEGORY_TYPE_BY_NAME[category.name] || 'main';

  const slots = buildSlots(rng, pantry, recipe);
  const ingredients = buildIngredients(rng, pantry);
  const instructions = buildInstructions(rng, categoryType, slots);
  const tips = buildTips(rng, categoryType, slots);

  return {
    slug: recipe.slug,
    name: recipe.name,
    description: recipe.description,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    ingredients,
    instructions,
    tips,
    cuisineName: cuisine.name,
    categoryName: category.name,
    countryFlag: cuisine.flag,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function loadCuisines() {
  const raw = fs.readFileSync(TAXONOMY_PATH, 'utf-8');
  return JSON.parse(raw).cuisines;
}

function flattenRecipes(cuisines) {
  const flat = [];
  for (const cuisine of cuisines) {
    for (const category of cuisine.categories) {
      for (const recipe of category.recipes) {
        flat.push({ cuisine, category, recipe });
      }
    }
  }
  return flat;
}

function main() {
  const { start, end } = parseArgs(process.argv.slice(2));
  const cuisines = loadCuisines();
  const allEntries = flattenRecipes(cuisines);

  const sliceStart = Math.max(0, start);
  const sliceEnd = Math.min(end, allEntries.length - 1);
  const slice = allEntries.slice(sliceStart, sliceEnd + 1);

  if (!slice.length) {
    console.log(`No recipes in range --start ${start} --end ${end} (total recipes: ${allEntries.length}).`);
    return;
  }

  console.log(
    `Generating recipes ${sliceStart}-${sliceEnd} of ${allEntries.length} total (${slice.length} recipe file(s))...`
  );

  slice.forEach(({ cuisine, category, recipe }, i) => {
    const content = buildRecipeContent(cuisine, category, recipe);
    const outDir = path.join(OUTPUT_ROOT, cuisine.slug, category.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${recipe.slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
    console.log(`Writing recipe ${i + 1}/${slice.length}: ${recipe.slug}`);
  });

  console.log(`✓ Wrote ${slice.length} recipe file(s) to ${path.relative(path.join(__dirname, '..'), OUTPUT_ROOT)}/`);
}

main();
