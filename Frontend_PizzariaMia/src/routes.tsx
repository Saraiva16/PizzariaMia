import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import MenuPage from './pages/Menu/Menu';
import CheckoutPage from './pages/Checkout/Checkout';
import Register from './pages/Register/Register';
import Profile from './pages/Profile/Profile';
import AddAddress from './pages/Profile/AddAddress';
import OrdersPage from './pages/Orders/Orders';
import TrackOrder from './pages/Orders/TrackOrder';
import EmployeeMenu from './pages/EmployeeMenu/EmployeeMenu';
import EmployeeCheckout from './pages/EmployeeCheckout/EmployeeCheckout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/cadastro',
    element: <Register />,
  },
  {
    path: '/cardapio',
    element: <MenuPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/perfil',
    element: <Profile />,
  },
  {
    path: '/perfil/endereco/novo',
    element: <AddAddress />,
  },
  {
    path: '/pedidos',
    element: <OrdersPage />,
  },
  {
    path: '/pedidos/:id/acompanhar',
    element: <TrackOrder />,
  },
  {
    path: '/funcionario/cardapio',
    element: (
      <ProtectedRoute allowedRoles={['Employee', 'Admin']}>
        <EmployeeMenu />
      </ProtectedRoute>
    ),
  },
  {
    path: '/funcionario/checkout',
    element: (
      <ProtectedRoute allowedRoles={['Employee', 'Admin']}>
        <EmployeeCheckout />
      </ProtectedRoute>
    ),
  },
  {
    path: '/employee/menu',
    element: <Navigate to="/funcionario/cardapio" replace />,
  },
  {
    path: '/employee/checkout',
    element: <Navigate to="/funcionario/checkout" replace />,
  },
]);

