import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";
import { Box, CircularProgress } from "@mui/material";
import { ToastContainer } from "react-toastify"; // <-- 1. Import
import "react-toastify/dist/ReactToastify.css";

// --- CORE COMPONENTS (Loaded immediately) ---
import AdminLayout from "./components/layout/Layout";
import ClientLayout from "./components/client_layout/ClientLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ClientMisReportPage from "./pages/client/ClientMisReportPage";

// --- PAGE COMPONENTS (Now lazy-loaded) ---
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const AdminLoginPage = React.lazy(() => import("./pages/auth/AdminLoginPage"));
const ForgotPasswordPage = React.lazy(() =>
  import("./pages/auth/ForgotPasswordPage")
);
const ResetPasswordPage = React.lazy(() =>
  import("./pages/auth/ResetPasswordPage")
);
const AdminDashboardPage = React.lazy(() =>
  import("./pages/admin/DashboardPage")
);
const AdminCreateUserPage = React.lazy(() =>
  import("./pages/admin/AdminCreateUserPage")
);
const AdminCreateCasePage = React.lazy(() =>
  import("./pages/admin/CreateCasePage")
);
const AdminCaseDetailPage = React.lazy(() =>
  import("./pages/admin/AdminCaseDetailPage")
);
const MisReportsPage = React.lazy(() => import("./pages/admin/MisReportsPage"));
const ClientDashboardPage = React.lazy(() =>
  import("./pages/client/ClientDashboardPage")
);
const ClientCreateCasePage = React.lazy(() =>
  import("./pages/client/ClientCreateCasePage")
);
const ClientCaseDetailPage = React.lazy(() =>
  import("./pages/client/ClientCaseDetailPage")
);
const ClientProfilePage = React.lazy(() =>
  import("./pages/client/ClientProfilePage")
);
const CandidateUploadPage = React.lazy(() =>
  import("./pages/candidate/CandidateUploadPage")
);

// A simple component to show while a lazy-loaded page is being fetched
const LoadingFallback = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/portal-admin/login" element={<AdminLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/reset-password/:token"
              element={<ResetPasswordPage />}
            />
            <Route path="/upload/:token" element={<CandidateUploadPage />} />
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminDashboardPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/create-user"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminCreateUserPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/create-case"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminCreateCasePage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/case/:id"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AdminCaseDetailPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <MisReportsPage />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Client Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute>
                  <ClientLayout>
                    <ClientDashboardPage />
                  </ClientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/create-case"
              element={
                <ProtectedRoute>
                  <ClientLayout>
                    <ClientCreateCasePage />
                  </ClientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/case/:id"
              element={
                <ProtectedRoute>
                  <ClientLayout>
                    <ClientCaseDetailPage />
                  </ClientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/profile"
              element={
                <ProtectedRoute>
                  <ClientLayout>
                    <ClientProfilePage />
                  </ClientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/mis-report"
              element={
                <ProtectedRoute>
                  <ClientLayout>
                    <ClientMisReportPage />
                  </ClientLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
