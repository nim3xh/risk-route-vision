import React from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface RiskCardProps {
  title: string;
  value: number;
  unit?: string;
  risk?: "high" | "medium" | "low";
  trend?: "up" | "down" | "stable";
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const RiskCard: React.FC<RiskCardProps> = ({
  title,
  value,
  unit = "%",
  risk,
  trend,
  subtitle,
  icon,
  className,
}) => {
  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case "high":
        return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "low":
        return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400";
    }
  };

  const getRiskIcon = (risk?: string) => {
    switch (risk) {
      case "high":
        return <AlertTriangle className="h-5 w-5" />;
      case "medium":
        return <AlertCircle className="h-5 w-5" />;
      case "low":
        return <CheckCircle2 className="h-5 w-5" />;
      default:
        return icon;
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm transition-all hover:shadow-lg",
        getRiskColor(risk),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold">{Math.round(value)}</span>
            <span className="text-lg opacity-60">{unit}</span>
          </div>
          {subtitle && <p className="text-xs mt-2 opacity-60">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {getRiskIcon(risk)}
          {trend && (
            <>
              {trend === "up" && (
                <TrendingUp className="h-5 w-5 text-red-500" />
              )}
              {trend === "down" && (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatGridProps {
  stats: RiskCardProps[];
  className?: string;
}

export const StatGrid: React.FC<StatGridProps> = ({ stats, className }) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
        className
      )}
    >
      {stats.map((stat, idx) => (
        <RiskCard key={idx} {...stat} />
      ))}
    </div>
  );
};
