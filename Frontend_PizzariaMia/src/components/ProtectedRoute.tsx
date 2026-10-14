import React from 'react';
import { Navigate } from 'react-router-dom';

interface UserData {
  token: string;
  name: string;
  phone: string;
  role: string;
}

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('@PizzariaMia:token');
  const storedUser = localStorage.getItem('@PizzariaMia:user');

  if (!token || !storedUser) {
    return <Navigate to="/" replace />;
  }

  let user: UserData;
  try {
    user = JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('@PizzariaMia:token');
    localStorage.removeItem('@PizzariaMia:user');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.some(
      (role) => role.toLowerCase() === (user.role || '').toLowerCase()
    );

    if (!hasRole) {
      // Se não tiver permissão, redireciona conforme o perfil atual
      const isEmployeeOrAdmin = ['employee', 'admin'].includes((user.role || '').toLowerCase());
      const fallbackRedirect = isEmployeeOrAdmin ? '/funcionario/cardapio' : '/cardapio';
      return <Navigate to={fallbackRedirect} replace />;
    }
  }

  return children;
};
