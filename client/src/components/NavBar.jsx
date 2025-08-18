// client/src/components/NavBar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function NavBar(){
  const { pathname } = useLocation();
  const nav = useNavigate();
  const active = (p) => (pathname === p ? "text-indigo-600" : "text-slate-600");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("department");
    nav("/login");
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">DMS</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className={active("/")}>ផ្ទាំងគ្រប់គ្រង</Link>
          <Link to="/new" className={active("/new")}>បញ្ចូលឯកសារ</Link>
            <Link to="/dispatch" className={active("/dispatch")}>បញ្ជូនឯកសារ</Link> {/* NEW */}
           <Link to="/process" className={active("/process")}>ដំណើរការ</Link>{/* NEW */}
          {!token ? (
            <Link to="/login" className={active("/login")}>ចូលគណនី</Link>
          ) : (
            <button onClick={logout} className="text-slate-600 hover:text-indigo-600">ចេញ</button>
          )}
        </nav>
      </div>
    </header>
  );
}
