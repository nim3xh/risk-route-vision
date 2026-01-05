import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Map as MapIcon, 
  Navigation, 
  Activity,
  LayoutDashboard
} from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: "Map", path: "/", icon: MapIcon },
  { title: "Route", path: "/route", icon: Activity },
  { title: "Live", path: "/live", icon: Navigation },
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard }
];

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header (Floating) */}
        <header className="lg:hidden absolute top-4 left-4 right-4 z-50 flex items-center justify-between px-4 py-2 glass-panel rounded-2xl shadow-xl border-white/20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">RiskRoute</span>
          </div>
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-xl">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 border-r-0 bg-background/95 backdrop-blur-xl">
              <div className="flex flex-col h-full">
                <div className="h-20 flex items-center px-6 border-b">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl">RiskRoute</span>
                  </div>
                </div>
                <div className="flex-1 py-6 px-4 space-y-2">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-lg" 
                            : "hover:bg-accent text-muted-foreground"
                        )}
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="font-semibold">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 h-full w-full overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
