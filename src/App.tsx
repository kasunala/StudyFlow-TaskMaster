import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import Login from "./components/auth/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AssignmentProvider } from "./contexts/AssignmentContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import { TimeFormatProvider } from "./contexts/TimeFormatContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProvider } from "./contexts/UserContext";
import routes from "tempo-routes";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <p className="flex items-center justify-center h-screen">Loading...</p>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center h-screen">Loading...</p>
      }
    >
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" />
          )}
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <AssignmentProvider>
            <TimeFormatProvider>
              <CalendarProvider>
                <AppRoutes />
              </CalendarProvider>
            </TimeFormatProvider>
          </AssignmentProvider>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
