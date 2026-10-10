import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login/Login';
import MenuPage from './pages/Menu/Menu';
import CheckoutPage from './pages/Checkout/Checkout';
import Register from './pages/Register/Register';
import Profile from './pages/Profile/Profile';
import AddAddress from './pages/Profile/AddAddress';
import OrdersPage from './pages/Orders/Orders';
import TrackOrder from './pages/Orders/TrackOrder';

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
]);
