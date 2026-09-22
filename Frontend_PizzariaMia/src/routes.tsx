import { createBrowserRouter } from 'react-router-dom';
import Login from './pages/Login';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  // We can add more routes here later
]);
