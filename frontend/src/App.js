import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Home from "@/pages/Home";
import Forums from "@/pages/Forums";
import ForumThread from "@/pages/ForumThread";
import Events from "@/pages/Events";
import Points from "@/pages/Points";
import Newsletters from "@/pages/Newsletters";
import Videos from "@/pages/Videos";
import Messages from "@/pages/Messages";
import Members from "@/pages/Members";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-14 h-14 border-2 border-black rounded-full bg-[var(--primary)] animate-pulse" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Layout>{children}</Layout>;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function RouterShell() {
  const location = useLocation();
  // Handle OAuth callback via URL fragment on any route
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/" element={<Protected><Home /></Protected>} />
      <Route path="/forums" element={<Protected><Forums /></Protected>} />
      <Route path="/forums/:id" element={<Protected><ForumThread /></Protected>} />
      <Route path="/events" element={<Protected><Events /></Protected>} />
      <Route path="/points" element={<Protected><Points /></Protected>} />
      <Route path="/newsletters" element={<Protected><Newsletters /></Protected>} />
      <Route path="/videos" element={<Protected><Videos /></Protected>} />
      <Route path="/messages" element={<Protected><Messages /></Protected>} />
      <Route path="/messages/:userId" element={<Protected><Messages /></Protected>} />
      <Route path="/members" element={<Protected><Members /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/u/:userId" element={<Protected><Profile /></Protected>} />
      <Route path="/admin" element={<Protected><AdminOnly><Admin /></AdminOnly></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouterShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
