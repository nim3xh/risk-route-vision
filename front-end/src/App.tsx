import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapOverview from "./pages/MapOverview";
import LiveDrive from "./pages/LiveDrive";
import RouteLookAhead from "./pages/RouteLookAhead";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { MainLayout } from "./components/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="risk-route-vision-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <MainLayout>
            <Routes>
              <Route path="/" element={<MapOverview />} />
              <Route path="/live" element={<LiveDrive />} />
              <Route path="/route" element={<RouteLookAhead />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
