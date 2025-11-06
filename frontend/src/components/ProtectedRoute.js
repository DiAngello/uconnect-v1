// Em src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../services/api'; // Sua função que verifica o token

const ProtectedRoute = () => {
  if (!isAuthenticated()) {
    // Se não estiver autenticado, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Se estiver autenticado, renderiza o componente da rota (ex: Chat)
  return <Outlet />;
};

export default ProtectedRoute;