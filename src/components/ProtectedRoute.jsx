import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isTeacherUser } from "../utils/authRole";
import Spinner from "./ui/Spinner";

// Teacher-cabinet app: the only role that may pass is a tenant-scoped teacher.
// Non-teachers are already signed out at login, so the requireTeacher guard is
// mostly a safety net that bounces any stray session back to the login screen.
export default function ProtectedRoute({ children, requireTeacher = false }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireTeacher && !isTeacherUser(user)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
