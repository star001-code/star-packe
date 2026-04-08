import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Home from "@/pages/home";
import Login from "@/pages/login";
import About from "@/pages/about";
import SearchPage from "@/pages/search";
import CalculatorPage from "@/pages/calculator";
import ManifestPage from "@/pages/manifest";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/about" component={About} />
      <Route path="/search" component={SearchPage} />
      <Route path="/calculator" component={CalculatorPage} />
      <Route path="/manifest" component={ManifestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 shrink-0 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="h-4 w-px bg-border/50" />
                <span className="text-sm font-semibold text-gradient-gold">
                  حاسبة فرق الرسم الكمركي
                </span>
              </header>
              <main className="flex-1 overflow-auto p-5">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
