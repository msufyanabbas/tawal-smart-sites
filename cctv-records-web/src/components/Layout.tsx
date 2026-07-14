import { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { Role } from "@/types";
import { roleLabel } from "@/utils/helpers";
import smartlifeLogo from "../../assets/smartlife-logo.png";
import tawalLogo from "../../assets/tawal-logo.svg";
interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const ALL_NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    roles: [Role.ADMIN, Role.MANAGER, Role.TECHNICIAN],
  },
  { to: "/sites", label: "Sites", roles: [Role.ADMIN, Role.MANAGER] },
  { to: "/sites", label: "My Sites", roles: [Role.TECHNICIAN] },
  { to: "/users", label: "Users", roles: [Role.ADMIN] },
  { to: "/serials", label: "Serials", roles: [Role.ADMIN] },
  { to: "/reports", label: "Reports", roles: [Role.ADMIN, Role.MANAGER] },
];

const BrandLockup: React.FC = () => (
  <div className="flex items-center gap-3">
    <img src={smartlifeLogo} alt="Smart Life" className="h-8 w-auto" />
    <span className="select-none text-lg font-light text-white/60">×</span>
    <img src={tawalLogo} alt="Tawal" className="h-8 w-auto logo-invert" />
  </div>
);

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = useMemo(
    () => (user ? ALL_NAV.filter((n) => n.roles.includes(user.role)) : []),
    [user],
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-navy-gradient shadow-navy">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <BrandLockup />

          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/sites"}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-500 text-white shadow-brand"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium text-white">
                {user?.name || user?.email}
              </p>
              <p className="text-xs text-white/60">
                {user ? roleLabel(user.role) : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold
                         text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === "/sites"}
              className={({ isActive }) =>
                clsx(
                  "flex-shrink-0 rounded-lg px-3 py-2 text-center text-sm font-medium",
                  isActive
                    ? "bg-brand-500 text-white"
                    : "text-white/80 hover:bg-white/10",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
