import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TenantModulesProvider } from "./context/TenantModulesContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ModuleRoute from "./components/layout/ModuleRoute";
import TeacherLayout from "./components/layout/TeacherLayout";
import Toast from "./components/ui/Toast";
import Login from "./pages/auth/Login";
import Spinner from "./components/ui/Spinner";
import { routeImports } from "./utils/prefetch";

// This is the standalone teacher cabinet app (Ustoz — Milliy CRM). It ships
// only the teacher routes; the admin/superadmin app lives in crm-frontend.
const NotFound = lazy(() => import("./pages/NotFound"));
const SubscriptionExpired = lazy(() => import("./pages/SubscriptionExpired"));
const TeacherDashboard = lazy(routeImports["/teacher/dashboard"]);
const TeacherGroups = lazy(routeImports["/teacher/groups"]);
const TeacherGroupDetail = lazy(routeImports["/teacher/groups/:groupId"]);
const TeacherAttendance = lazy(routeImports["/teacher/attendance"]);
const TeacherExams = lazy(routeImports["/teacher/exams"]);
const TeacherHomework = lazy(routeImports["/teacher/homework"]);
const TeacherBehaviour = lazy(routeImports["/teacher/behaviour"]);
const TeacherBooking = lazy(routeImports["/teacher/booking"]);
const TeacherSchedule = lazy(routeImports["/teacher/schedule"]);
const TeacherSalary = lazy(routeImports["/teacher/salary"]);
const TeacherChat = lazy(routeImports["/teacher/chat"]);
const TeacherChatThread = lazy(routeImports["/teacher/chat/:threadId"]);

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size={32} />
    </div>
  );
}

function RoleBasedRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={32} />
      </div>
    );
  }

  // Non-teachers never reach an authenticated state here (Login signs them
  // out), so an authenticated user is always a teacher.
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/teacher/dashboard" replace />;
}

function TeacherApp() {
  return (
    <AuthProvider>
      <TenantModulesProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="subscription-expired" element={<SubscriptionExpired />} />

            <Route
              path="teacher"
              element={
                <ProtectedRoute requireTeacher>
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="groups" element={<TeacherGroups />} />
              <Route path="groups/:groupId" element={<TeacherGroupDetail />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="exams" element={<TeacherExams />} />
              <Route path="homework" element={<TeacherHomework />} />
              <Route
                path="behaviour"
                element={
                  <ModuleRoute moduleKey="teacher_cabinet" requiredPermission="teacher_cabinet.behaviour">
                    <TeacherBehaviour />
                  </ModuleRoute>
                }
              />
              <Route
                path="booking"
                element={
                  <ModuleRoute moduleKey="teacher_cabinet" requiredPermission="teacher_cabinet.booking">
                    <TeacherBooking />
                  </ModuleRoute>
                }
              />
              <Route path="schedule" element={<TeacherSchedule />} />
              <Route path="salary" element={<TeacherSalary />} />
              <Route
                path="chat"
                element={
                  <ModuleRoute moduleKey="teacher_cabinet" requiredPermission="teacher_cabinet.chat">
                    <TeacherChat />
                  </ModuleRoute>
                }
              />
              <Route
                path="chat/:threadId"
                element={
                  <ModuleRoute moduleKey="teacher_cabinet" requiredPermission="teacher_cabinet.chat">
                    <TeacherChatThread />
                  </ModuleRoute>
                }
              />
            </Route>

            <Route index element={<RoleBasedRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TenantModulesProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/*" element={<TeacherApp />} />
      </Routes>
    </BrowserRouter>
  );
}
