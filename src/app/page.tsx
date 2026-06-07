import Link from 'next/link';
import { getCuisines } from '@/lib/taxonomy';

export default function Home() {
  const cuisines = getCuisines();

  return (
    <div className="min-h-screen bg-stone-50">
      <section className="bg-gradient-to-br from-orange-800 via-orange-700 to-amber-600 text-white px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Cuisines By Country
        </h1>
        <p className="text-xl text-orange-100 max-w-lg mx-auto leading-relaxed">
          Explore authentic recipes from around the world
        </p>
      </section>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-8">
          10 Cuisines
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {cuisines.map((cuisine) => (
            <Link
              key={cuisine.slug}
              href={`/cuisine/${cuisine.slug}`}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-orange-100 bg-white px-4 py-8 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
            >
              <span className="text-5xl leading-none">{cuisine.flag}</span>
              <div className="text-center">
                <p className="font-semibold text-stone-800 leading-snug group-hover:text-orange-700 transition-colors">
                  {cuisine.name.replace(' Cuisine', '')}
                </p>
                <p className="mt-1 text-sm text-stone-400">{cuisine.country}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
