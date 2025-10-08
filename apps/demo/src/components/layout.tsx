import { useModel } from '@firsttx/local-first';
import { Link, Outlet, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { CartModel } from '../models/cart-model';

type ApproachType = 'firsttx' | 'vanilla' | 'react-query' | 'loader';

const APPROACHES: { value: ApproachType; label: string }[] = [
  { value: 'firsttx', label: 'FirstTx' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'react-query', label: 'React Query' },
  { value: 'loader', label: 'RR7 Loader' },
];

export function Layout() {
  const location = useLocation();
  const [cart] = useModel(CartModel);
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentApproach = pathSegments[1] as ApproachType | undefined;
  const currentPage = pathSegments[2] as 'products' | 'cart' | undefined;
  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">FirstTx</span>
              {!isHomePage && (
                <span className="text-sm text-gray-500 dark:text-gray-400">/ Demo</span>
              )}
            </Link>
            <div className="flex items-center gap-6">
              {currentApproach && (
                <>
                  <div className="flex gap-2">
                    {APPROACHES.map((approach) => (
                      <Link key={approach.value} to={`/demo/${approach.value}/products`}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            currentApproach === approach.value
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {approach.label}
                        </motion.button>
                      </Link>
                    ))}
                  </div>
                  <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
                  <div className="flex gap-4">
                    <Link
                      to="/demo"
                      className={`text-sm font-medium ${
                        currentPage === 'products'
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={`/demo/${currentApproach}/cart`}
                      className={`text-sm font-medium flex items-center gap-2 ${
                        currentPage === 'cart'
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      Cart
                      {cartItemCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                          {cartItemCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </>
              )}
              <a
                href="https://github.com/joseph0926/firsttx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                GitHub →
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
