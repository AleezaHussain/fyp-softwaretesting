import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/store'

// Auth Pages
import { SignUp } from './pages/auth/SignUp'
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'

// Main Pages
import { Dashboard } from './pages/Dashboard'
import { InputManagement } from './pages/InputManagement'
import { SimulationResults } from './pages/SimulationResults'
import { Advisory } from './pages/Advisory'
import { Reporting } from './pages/Reporting'
import { Profile } from './pages/Profile'
import { Simulations } from './pages/Simulations'
import { NewSimulation } from './pages/NewSimulation'
import { DataCenterBuilder } from './pages/DataCenterBuilder'
import Homepage from './pages/Homepage'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Homepage */}
        <Route path="/" element={<Homepage />} />
        
        {/* Auth Routes */}
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        
        {/* Backward compatibility */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/input-management"
          element={
            <ProtectedRoute>
              <InputManagement />
            </ProtectedRoute>
          }
        />
        {/* Unprotected debug route for Input Management (use during local testing) */}
        <Route path="/input-management-debug" element={<InputManagement />} />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <SimulationResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/advisory"
          element={
            <ProtectedRoute>
              <Advisory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reporting />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulations"
          element={
            <ProtectedRoute>
              <Simulations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation/new"
          element={
            <ProtectedRoute>
              <NewSimulation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder"
          element={
            <ProtectedRoute>
              <DataCenterBuilder />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/dashboard-redirect" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
