import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider, NetworkBanner } from './components/ui.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LogsPage from './pages/LogsPage.jsx';
import EnrollPage from './pages/EnrollPage.jsx';
import BulkEnrollPage from './pages/BulkEnrollPage.jsx';
import RecognizePage from './pages/RecognizePage.jsx';
import LivePage from './pages/LivePage.jsx';
import EntitiesPage from './pages/EntitiesPage.jsx';

function AppShell() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans">
      <NetworkBanner />
      {isAuthenticated && <Sidebar />}
      <main className={isAuthenticated ? 'ml-64 p-xl animate-fade-in' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live"
            element={
              <ProtectedRoute>
                <LivePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recognize"
            element={
              <ProtectedRoute>
                <RecognizePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enroll"
            element={
              <ProtectedRoute>
                <EnrollPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bulk-enroll"
            element={
              <ProtectedRoute>
                <BulkEnrollPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entities"
            element={
              <ProtectedRoute roles={['admin']}>
                <EntitiesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
