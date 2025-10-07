import { Link } from 'react-router';

type Approach = {
  id: string;
  name: string;
  description: string;
  color: string;
  pros: string[];
  cons: string[];
  bestFor: string;
};

const APPROACHES: Approach[] = [
  {
    id: 'firsttx',
    name: 'FirstTx',
    description: 'Local-First with IndexedDB + Atomic Transactions',
    color: 'border-purple-500',
    pros: [
      'Instant revisit (0ms from cache)',
      'Atomic rollback on failure',
      'Offline-capable',
      'Persistent state across sessions',
    ],
    cons: ['New library to learn', 'Initial setup complexity', 'Browser-only (IndexedDB)'],
    bestFor: 'Apps with frequent revisits and complex state management',
  },
  {
    id: 'vanilla',
    name: 'Vanilla (fetch/axios)',
    description: 'Basic fetch API without any caching layer',
    color: 'border-gray-500',
    pros: ['No dependencies', 'Simple and straightforward', 'Full control over requests'],
    cons: [
      'No caching (slow revisits)',
      'Manual error handling',
      'No optimistic updates',
      'Boilerplate code',
    ],
    bestFor: 'Simple apps or learning purposes',
  },
  {
    id: 'react-query',
    name: 'React Query',
    description: 'Server state management with automatic caching',
    color: 'border-blue-500',
    pros: [
      'Memory cache (fast revisits)',
      'Automatic background refetch',
      'Built-in loading/error states',
      'Optimistic updates support',
    ],
    cons: [
      'Memory-only (lost on refresh)',
      'Complex config for advanced cases',
      'Additional bundle size',
    ],
    bestFor: 'Most modern React apps with server data',
  },
  {
    id: 'loader',
    name: 'React Router v7 Loader',
    description: 'SSR-like data loading at route level',
    color: 'border-green-500',
    pros: [
      'Data ready before render',
      'No loading states needed',
      'SSR-compatible',
      'Router-integrated',
    ],
    cons: ['No client-side cache', 'Tight coupling to router', 'Less flexible than queries'],
    bestFor: 'SSR/SSG apps or when data is route-specific',
  },
];

export function ComparisonDashboard() {
  return (
    <div className="container mx-auto mb-10 p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Compare Data Fetching Approaches</h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          This demo compares four different approaches to data fetching in React. Each approach
          handles the same product catalog and shopping cart, but with different trade-offs in
          performance, complexity, and user experience.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6 h-40">
        {APPROACHES.map((approach) => (
          <div
            key={approach.id}
            className={`border-2 ${approach.color} rounded-lg p-6 hover:shadow-xl transition-shadow`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{approach.name}</h2>
                <p className="text-gray-600 text-sm">{approach.description}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-2">✓ Pros</h3>
                <ul className="text-sm space-y-1">
                  {approach.pros.map((pro, i) => (
                    <li key={i} className="text-gray-700">
                      • {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-red-700 mb-2">✗ Cons</h3>
                <ul className="text-sm space-y-1">
                  {approach.cons.map((con, i) => (
                    <li key={i} className="text-gray-700">
                      • {con}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm">
                  <span className="font-semibold">Best for:</span>{' '}
                  <span className="text-gray-700">{approach.bestFor}</span>
                </p>
              </div>
            </div>
            <Link
              to={`/${approach.id}/products`}
              className="block w-full bg-gray-900 text-white text-center py-3 rounded font-semibold hover:bg-gray-800 transition-colors"
            >
              Try {approach.name} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
