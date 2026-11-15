import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../layouts/MainLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ManagerDashboard } from '../pages/manager/ManagerDashboard';
import { MedicinesPage } from '../pages/manager/MedicinesPage';
import { CategoriesPage } from '../pages/manager/CategoriesPage';
import { SuppliersPage } from '../pages/manager/SuppliersPage';
import { ReportsPage } from '../pages/manager/ReportsPage';
import { UsersPage } from '../pages/manager/UsersPage';

import { CashierPOSPage } from '../pages/cashier/CashierPOSPage';
import { CashierDashboard } from '../pages/cashier/CashierDashboard';
import { CustomersPage } from '../pages/cashier/CustomersPage';

import { StockDashboard } from '../pages/stock/StockDashboard';
import { PurchasePage } from '../pages/stock/PurchasePage';
import { BatchesPage } from '../pages/stock/BatchesPage';
import { AlertsPage } from '../pages/stock/AlertsPage';

import { SalesHistoryPage } from '../pages/shared/SalesHistoryPage';
import { CreditManagementPage } from '../pages/shared/CreditManagementPage';

// Smart Home Redirection based on Role
const HomeRedirect = () => {
  const { role } = useAuth();
  if (role === 'Manager') return <Navigate to="/manager/dashboard" replace />;
  if (role === 'Cashier') return <Navigate to="/cashier/pos" replace />;
  if (role === 'Stock Handler') return <Navigate to="/stock/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Role-Protected Routes with MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      {/* Manager Routes */}
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Manager']}>
            <MainLayout>
              <ManagerDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/medicines"
        element={
          <ProtectedRoute allowedRoles={['Manager']}>
            <MainLayout>
              <MedicinesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/categories"
        element={
          <ProtectedRoute allowedRoles={['Manager']}>
            <MainLayout>
              <CategoriesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/suppliers"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Stock Handler']}>
            <MainLayout>
              <SuppliersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/reports"
        element={
          <ProtectedRoute allowedRoles={['Manager']}>
            <MainLayout>
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/users"
        element={
          <ProtectedRoute allowedRoles={['Manager']}>
            <MainLayout>
              <UsersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Cashier Routes */}
      <Route
        path="/cashier/pos"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Cashier']}>
            <MainLayout>
              <CashierPOSPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashier/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Cashier']}>
            <MainLayout>
              <CashierDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashier/customers"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Cashier']}>
            <MainLayout>
              <CustomersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Stock Handler Routes */}
      <Route
        path="/stock/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Stock Handler']}>
            <MainLayout>
              <StockDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock/purchase"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Stock Handler']}>
            <MainLayout>
              <PurchasePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock/batches"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Stock Handler']}>
            <MainLayout>
              <BatchesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock/alerts"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Stock Handler']}>
            <MainLayout>
              <AlertsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/sales/history"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Cashier']}>
            <MainLayout>
              <SalesHistoryPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/credit"
        element={
          <ProtectedRoute allowedRoles={['Manager', 'Cashier']}>
            <MainLayout>
              <CreditManagementPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
