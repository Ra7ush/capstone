import { Navigate, Routes, Route } from "react-router";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import DashboardLayout from "./layouts/DashBoardLayout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Finances from "./pages/Finances";
import Moderations from "./pages/Moderations";
import Verifications from "./pages/Verifications";
import Health from "./pages/Health";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";

function ProtectedRoute({ children, session }) {
  if (session === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 shadow-xl">
        <span className="loading loading-dots loading-lg text-primary"></span>
      </div>
    );
  if (!session) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            session &&
            session.user?.email === import.meta.env.VITE_ADMIN_EMAIL ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="finances" element={<Finances />} />
          <Route path="moderations" element={<Moderations />} />
          <Route path="verifications" element={<Verifications />} />
          <Route path="health" element={<Health />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#000",
            color: "#fff",
            borderRadius: "16px",
            fontSize: "12px",
            fontWeight: "bold",
            padding: "12px 24px",
          },
          success: {
            iconTheme: {
              primary: "#FF4D00",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}

export default App;
