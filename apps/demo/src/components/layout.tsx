import { useModel } from '@firsttx/local-first';
import { Link, Outlet, useLocation } from 'react-router';
import { CartModel } from '../models/cart-model';

type ApproachType = 'firsttx' | 'vanilla' | 'react-query' | 'loader';

const APPROACHES: { value: ApproachType; label: string; color: string }[] = [
  { value: 'firsttx', label: 'FirstTx', color: 'bg-purple-600' },
  { value: 'vanilla', label: 'Vanilla', color: 'bg-gray-600' },
  { value: 'react-query', label: 'React Query', color: 'bg-blue-600' },
  { value: 'loader', label: 'RR7 Loader', color: 'bg-green-600' },
];

export function Layout() {
  const location = useLocation();
  const [cart] = useModel(CartModel);

  const currentApproach = location.pathname.split('/')[1] as ApproachType | undefined;
  const currentPage = location.pathname.split('/')[2] as 'products' | 'cart' | undefined;

  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-8 py-4">
          <div className="flex justify-between items-center mb-4">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              FirstTx Comparison Demo
            </Link>
            <div className="text-sm text-gray-500">Comparing Local-First approaches</div>
          </div>
          {currentApproach && (
            <div className="flex gap-6 items-center">
              <div className="flex gap-2">
                {APPROACHES.map((approach) => (
                  <Link
                    key={approach.value}
                    to={`/${approach.value}/products`}
                    className={`px-4 py-2 rounded font-semibold text-white ${approach.color} ${
                      currentApproach === approach.value
                        ? 'ring-2 ring-offset-2 ring-gray-900'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {approach.label}
                  </Link>
                ))}
              </div>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex gap-4">
                <Link
                  to={`/${currentApproach}/products`}
                  className={`text-lg font-semibold ${
                    currentPage === 'products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Products
                </Link>
                <Link
                  to={`/${currentApproach}/cart`}
                  className={`text-lg font-semibold flex items-center gap-2 ${
                    currentPage === 'cart'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cart
                  {cartItemCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
