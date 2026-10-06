import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login/Login';
import MenuPage from './pages/Menu/Menu';
import CheckoutPage from './pages/Checkout/Checkout';
import EmployeeMenu from './pages/EmployeeMenu/EmployeeMenu';
import EmployeeCheckout from './pages/EmployeeCheckout/EmployeeCheckout';

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
  {
    path: '/employee/menu',
    element: <EmployeeMenu />,
  },
  {
    path: '/employee/checkout',
    element: <EmployeeCheckout />,
  },
]);
