import { Link, useLocation } from 'react-router-dom';
import {
  Plane,
  LayoutDashboard,
  Navigation,
  CalendarOff,
  UserCircle,
  Megaphone,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Database,
  MessagesSquare,
  BriefcaseBusiness,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  hasUnseenPendingLoaRequests,
  hasUnseenSeniorManagementRequests,
  isBoardAdmin,
  subscribeToStore,
  updatePreferredTheme,
} from '@/lib/dataStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { getRolesArray, hasRole } from '@/lib/roleUtils';

export default function Sidebar({ crewMember, onLogout, themePreference, onThemeChange }) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasNewLoaRequest, setHasNewLoaRequest] = useState(false);
  const [hasNewSeniorRequest, setHasNewSeniorRequest] = useState(false);
  const isAdmin = isBoardAdmin(crewMember);
  const isExecutive = hasRole(crewMember, 'Executive Board');

  useEffect(() => {
    const sync = async () => {
      setHasNewLoaRequest(await hasUnseenPendingLoaRequests());
      setHasNewSeniorRequest(await hasUnseenSeniorManagementRequests());
    };
    sync();
    return subscribeToStore(sync);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/flights', label: 'Flights', icon: Navigation },
    { path: '/loa', label: 'Leave of Absence', icon: CalendarOff },
    { path: '/staff-database', label: 'Staff Database', icon: Database },
    { path: '/senior-management', label: 'Contact SM', icon: MessagesSquare },
    { path: '/profile', label: 'My Profile', icon: UserCircle },
  ];

  const adminItems = [
    ...(isAdmin ? [{ path: '/admin/notices', label: 'Manage Notices', icon: Megaphone }] : []),
    ...(isExecutive ? [{ path: '/admin/crew', label: 'Manage Crew', icon: Shield }] : []),
    ...(isAdmin ? [{ path: '/admin/loa', label: 'LOA Requests', icon: CalendarOff, hasNotification: hasNewLoaRequest }] : []),
    ...(isAdmin ? [{ path: '/admin/senior-management', label: 'Requests', icon: BriefcaseBusiness, hasNotification: hasNewSeniorRequest }] : []),
  ];

  const nextTheme = themePreference === 'dark' ? 'light' : 'dark';

  const handleThemeToggle = async () => {
    if (!crewMember?.id) return;
    const selectedTheme = nextTheme;
    onThemeChange?.(selectedTheme);
    try {
      await updatePreferredTheme(crewMember.id, selectedTheme);
    } catch {
      // Keep the chosen theme applied locally even if the background save fails.
    }
  };

  const renderNavLink = (item, mobile = false) => (
    <Link
      key={item.path}
      to={item.path}
      onClick={() => {
        if (mobile) setMobileOpen(false);
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
        location.pathname === item.path
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex items-center gap-2">
        <span>{item.label}</span>
        {item.hasNotification && <span className="h-2 w-2 rounded-full bg-red-500" />}
      </span>
    </Link>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-x-0 top-0 z-50 border-b border-sidebar-border bg-sidebar/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#8f1016]">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-sm font-bold text-sidebar-primary-foreground">Corendon Airlines</h1>
                <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Crew Portal</p>
              </div>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-foreground">
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                <div className="flex h-full flex-col">
                  <div className="border-b border-sidebar-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#8f1016]">
                        <Plane className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-base font-bold text-sidebar-primary-foreground">Crew Portal</h2>
                        <p className="text-xs text-sidebar-foreground/50">{crewMember?.display_name}</p>
                      </div>
                    </div>
                  </div>

                  <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
                    <div className="space-y-1">
                      <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40">Main</p>
                      {navItems.map(item => renderNavLink(item, true))}
                    </div>

                    {adminItems.length > 0 && (
                      <div className="space-y-1">
                        <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40">Senior Management</p>
                        {adminItems.map(item => renderNavLink(item, true))}
                      </div>
                    )}
                  </nav>

                  <div className="border-t border-sidebar-border p-3">
                    <button
                      onClick={handleThemeToggle}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      {themePreference === 'dark' ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
                      <span>{themePreference === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileOpen(false);
                        await onLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/70 transition-all hover:bg-red-500/10 hover:text-red-400"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </>
    );
  }

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8f1016] rounded-xl flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-sidebar-primary-foreground text-sm truncate">Corendon Airlines</h1>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Crew Portal</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-sidebar-foreground" /> : <ChevronLeft className="w-3 h-3 text-sidebar-foreground" />}
      </button>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest px-3 mb-2">Main</p>}
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
              location.pathname === item.path
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {adminItems.length > 0 && (
          <>
            {!collapsed && <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest px-3 mt-6 mb-2">Senior Management</p>}
            {adminItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  location.pathname === item.path
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.hasNotification && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </span>
                )}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleThemeToggle}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full mt-1",
            collapsed && "justify-center"
          )}
        >
          {themePreference === 'dark' ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && <span>{themePreference === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center")}>
          <div className="w-8 h-8 bg-sidebar-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sidebar-foreground">{crewMember?.display_name?.[0]}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{crewMember?.display_name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{getRolesArray(crewMember).join(', ')}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={async () => { await onLogout(); }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all w-full mt-1",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
