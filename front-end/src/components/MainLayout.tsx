import React from "react";
import { Sidebar, NAV_ITEMS, NavItem } from "./Sidebar";
import { Menu, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface MainLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, navItems = NAV_ITEMS }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar navItems={navItems} />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Topbar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-xl border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">RiskRoute</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-[0.16em]">Safety Intel</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <MobileNav navItems={navItems} currentPath={location.pathname} />
          </div>
        </header>

        <main className="flex-1 h-full w-full overflow-hidden pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t">
          <div className="grid grid-cols-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[11px]">{item.title.replace("Map ", "")}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

type MobileNavProps = {
  navItems: NavItem[];
  currentPath: string;
};

const MobileNav: React.FC<MobileNavProps> = ({ navItems, currentPath }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 border-r-0 bg-background/95 backdrop-blur-xl">
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Navigate</span>
            </div>
          </div>
          <div className="flex-1 py-4 px-4 space-y-2">
            {navItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "hover:bg-accent text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{item.title}</span>
                    {item.description && (
                      <span className="text-[10px] opacity-70">{item.description}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
