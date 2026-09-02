import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Guards a route behind authentication, and optionally a set of allowed
 * roles for RBAC. Redirects to /login, preserving the intended destination.
 *
 * @param {{children: React.ReactNode, roles?: string[]}} props
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return (
      <div className="max-w-md mx-auto mt-xxl text-center flat-card p-lg">
        <h1 className="text-headline-md text-on-surface">Access restricted</h1>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          Your role ({role || 'unknown'}) doesn't have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
