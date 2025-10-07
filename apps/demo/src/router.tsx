import { createBrowserRouter } from 'react-router';
import { Layout } from './components/layout';
import { ComparisonDashboard } from './pages/comparison-dashboard';

import { ProductsPage as FirstTxProductsPage } from './pages/firsttx/products-page';
import { CartPage as FirstTxCartPage } from './pages/firsttx/cart-page';

import { ProductsPage as VanillaProductsPage } from './pages/vanilla/products-page';
import { CartPage as VanillaCartPage } from './pages/vanilla/cart-page';

import { ProductsPage as RQProductsPage } from './pages/react-query/products-page';
import { CartPage as RQCartPage } from './pages/react-query/cart-page';

import { ProductsPage as LoaderProductsPage, productsLoader } from './pages/loader/products-page';
import { CartPage as LoaderCartPage } from './pages/loader/cart-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <ComparisonDashboard />,
      },
      {
        path: 'firsttx',
        children: [
          { path: 'products', element: <FirstTxProductsPage /> },
          { path: 'cart', element: <FirstTxCartPage /> },
        ],
      },
      {
        path: 'vanilla',
        children: [
          { path: 'products', element: <VanillaProductsPage /> },
          { path: 'cart', element: <VanillaCartPage /> },
        ],
      },
      {
        path: 'react-query',
        children: [
          { path: 'products', element: <RQProductsPage /> },
          { path: 'cart', element: <RQCartPage /> },
        ],
      },
      {
        path: 'loader',
        children: [
          {
            path: 'products',
            element: <LoaderProductsPage />,
            loader: productsLoader,
          },
          { path: 'cart', element: <LoaderCartPage /> },
        ],
      },
    ],
  },
]);
