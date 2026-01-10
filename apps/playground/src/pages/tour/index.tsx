import { Outlet, Navigate, useLocation } from 'react-router';
import { TourLayout } from '@/components/tour';

export default function TourPage() {
  const location = useLocation();

  if (location.pathname === '/tour' || location.pathname === '/tour/') {
    return <Navigate to="/tour/problem" replace />;
  }

  return (
    <TourLayout>
      <Outlet />
    </TourLayout>
  );
}
