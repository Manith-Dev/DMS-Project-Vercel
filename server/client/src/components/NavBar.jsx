import React from "react";
import { Link, useLocation } from "react-router-dom";
export default function NavBar(){
  const { pathname } = useLocation();
  const active = (p) => (pathname === p ? "text-indigo-600" : "text-slate-600");
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">DMS</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className={active("/")}>ផ្ទាំងគ្រប់គ្រង</Link>
          <Link to="/new" className={active("/new")}>បញ្ចូលឯកសារ</Link>
        </nav>
      </div>
    </header>
  );
}
