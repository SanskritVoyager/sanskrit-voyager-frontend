import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/book/:slug', element: <HomePage /> },
  { path: '/book/:slug/:segment', element: <HomePage /> },
  { path: '/text/:slug', element: <HomePage /> },
  { path: '/text/:slug/:segment', element: <HomePage /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
