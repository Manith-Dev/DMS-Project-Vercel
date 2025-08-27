import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;              // or your existing spinner if you have one
  return user ? children : <Navigate to="/login" replace />;
}
