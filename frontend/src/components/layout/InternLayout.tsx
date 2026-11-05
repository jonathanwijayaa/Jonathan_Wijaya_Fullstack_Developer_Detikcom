import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function InternLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = "Dashboard";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Detik<span className="text-accent">Hadir</span>
          </h1>
          <p className="text-sm text-muted-foreground">Intern Portal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </Button>
      </div>

      <nav className="flex-1 p-4">
        <NavLink
          to="/intern/dashboard"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition border-l-4 ${
              isActive
                ? "bg-primary text-primary-foreground border-accent shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border-transparent"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconDashboard
                className={
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }
              />
              <span>Dashboard</span>
            </>
          )}
        </NavLink>
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-border text-foreground hover:bg-muted"
          onClick={handleLogout}
        >
          <LogOut size={16} className="text-muted-foreground" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-card shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="min-h-screen flex-1 md:ml-64">
        <header className="flex h-16 items-center border-b border-border bg-card px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function IconDashboard({ className }: { className?: string }) {
  return <LayoutDashboard size={18} className={className} />;
}
