import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/Header";
import FloatingChatButton from "@/components/FloatingChatButton";
import Index from "./pages/Index";
import Catalogo from "./pages/Catalogo";
import Cotizar from "./pages/Cotizar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import DashboardAuthGuard from "./components/DashboardAuthGuard";

const queryClient = new QueryClient();

const Shell = () => {
  const { pathname } = useLocation();
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname.startsWith("/login");
  const hideChrome = isDashboard || isLogin;
  return (
    <>
      {!hideChrome && <Header />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/cotizar" element={<Cotizar />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <DashboardAuthGuard>
              {({ user }) => <Dashboard dashboardUser={user} />}
            </DashboardAuthGuard>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideChrome && <FloatingChatButton />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
