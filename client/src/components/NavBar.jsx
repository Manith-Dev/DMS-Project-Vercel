// client/src/components/NavBar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth(); // ← Firebase user + logout()

  const active = (p) => (pathname === p ? "text-indigo-600" : "text-slate-600");

  async function handleLogout() {
    try {
      await logout();                // sign out from Firebase
    } finally {
      // clean up any old localStorage values from the legacy system (safe no-op)
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("department");
      nav("/login", { replace: true });
    }
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">DMS</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className={active("/")}>ផ្ទាំងគ្រប់គ្រងឯកសារចូល</Link>
          {/* <Link to="/new" className={active("/new")}>បញ្ចូលឯកសារ</Link> */}
          <Link to="/dispatch" className={active("/dispatch")}>ផ្ទាំងគ្រប់គ្រងឯកសារបញ្ជូន</Link>
          <Link to="/process" className={active("/process")}>ដំណើរការ</Link>

          {!user ? (
            <Link to="/login" className={active("/login")}>ចូលគណនី</Link>
          ) : (
            <button onClick={handleLogout} className="text-slate-600 hover:text-indigo-600">
              ចេញ
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
