import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login/Login';
import MenuPage from './pages/Menu/Menu';
import CheckoutPage from './pages/Checkout/Checkout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/cardapio',
    element: <MenuPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
]);
