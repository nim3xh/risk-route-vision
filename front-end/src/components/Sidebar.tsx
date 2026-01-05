import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Map as MapIcon,
  Navigation,
  Activity,
  ShieldAlert,
  ChevronRight,
  Info,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

export type NavItem = {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Map Overview",
    path: "/",
    icon: MapIcon,
    description: "Regional risk heatmap"
  },
  {
    title: "Route Analysis",
    path: "/route",
    icon: Activity,
    description: "Plan your safe path"
  },
  {
    title: "Live Drive",
    path: "/live",
    icon: Navigation,
    description: "Real-time risk radar"
  },
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    description: "Model performance"
  }
];

interface SidebarProps {
  navItems?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ navItems = NAV_ITEMS }) => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <ShieldAlert className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gradient">RiskRoute</span>
        </div>
      </div>

      <div className="flex-1 py-8 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                  : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )} />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{item.title}</span>
                <span className={cn(
                  "text-[10px] opacity-70",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {item.description}
                </span>
              </div>
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t bg-accent/20">
        <div className="flex items-center justify-between p-2 rounded-xl bg-card/80 border">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">v1.2.0</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};
