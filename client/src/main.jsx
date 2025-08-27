
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NavBar from "./components/NavBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewDocument from "./pages/NewDocument.jsx";
import EditDocument from "./pages/EditDocument.jsx";
import Process from "./pages/Process.jsx";
import Dispatch from "./pages/Dispatch.jsx";
import Timeline from "./pages/Timeline.jsx";
import Login from "./pages/Login.jsx";

import "./styles/index.css";

import { AuthProvider } from "./app/AuthProvider.jsx";
import ProtectedRoute from "./app/ProtectedRoute.jsx";

function App() {
  return (
    <div className="min-h-screen flex flex-col font-kh">
      <NavBar />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><NewDocument /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditDocument /></ProtectedRoute>} />
          <Route path="/process" element={<ProtectedRoute><Process /></ProtectedRoute>} />
          <Route path="/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
          <Route path="/timeline/:id" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
