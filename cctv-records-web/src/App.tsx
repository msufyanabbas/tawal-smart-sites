import { Navigate, Route, Routes } from "react-router-dom";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RequireRole,
} from "@/components/ProtectedRoute";
import { AuthLayout } from "@/components/AuthLayout";
import { Layout } from "@/components/Layout";
import { Role } from "@/types";

import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SitesListPage } from "@/pages/SitesListPage";
import { SiteDetailPage } from "@/pages/SiteDetailPage";
import { EditSitePage } from "@/pages/EditSitePage";
import { NewSitePage } from "@/pages/NewSitePage";
import { UsersPage } from "@/pages/UsersPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SerialsPage } from "@/pages/SerialsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />

    <Route element={<PublicOnlyRoute />}>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/sites" element={<SitesListPage />} />
        <Route path="/sites/:id" element={<SiteDetailPage />} />

        <Route element={<RequireRole roles={[Role.ADMIN]} />}>
          <Route path="/sites/new" element={<NewSitePage />} />
          <Route path="/sites/:id/edit" element={<EditSitePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/serials" element={<SerialsPage />} />
        </Route>

        <Route element={<RequireRole roles={[Role.ADMIN, Role.MANAGER]} />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
