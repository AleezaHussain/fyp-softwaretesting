import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./store/store";

// Auth Pages
import { SignUp } from "./pages/auth/SignUp";
import { Login } from "./pages/auth/Login";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
// import { ConfirmEmail } from "./pages/auth/ConfirmEmail";

// Main Pages
import { Dashboard } from "./pages/Dashboard";
import { InputManagement } from "./pages/InputManagement";
import { SimulationResults } from "./pages/SimulationResults";
import Advisory from "./pages/Advisory";
import { Reporting } from "./pages/Reporting";
import { Profile } from "./pages/Profile";
import { Simulations } from "./pages/Simulations";
import SimulationDetail from "./pages/SimulationDetail";
import { NewSimulation } from "./pages/NewSimulation";
import Homepage from "./pages/Homepage";

import RawResultsPage from "./pages/RawResultsPage";
import TechnicalGuide from "./pages/TechnicalGuide";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize authentication state on app load
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <Routes>
        {/* Public Homepage */}
        <Route path="/" element={<Homepage />} />

        {/* Auth Routes */}
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        {/* <Route path="/auth/confirm-email" element={<ConfirmEmail />} /> */}

        {/* Backward compatibility */}
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* <Route path="/confirm-email" element={<ConfirmEmail />} /> */}

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
          path="/raw-results"
          element={
            <ProtectedRoute>
              <RawResultsPage />
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
          path="/simulation/:id"
          element={
            <ProtectedRoute>
              <SimulationDetail />
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
          path="/technical-guide"
          element={
            <ProtectedRoute>
              <TechnicalGuide />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/dashboard-redirect"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
