// client/src/components/NavBar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = React.useState(false);

  const active = (p) => (pathname === p ? "text-indigo-600" : "text-slate-600");

  async function handleLogout() {
    try {
      await logout(); // Firebase signOut
    } finally {
      // clean legacy keys if any
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("department");
      nav("/login", { replace: true });
    }
  }

  function initialsFromUser(u) {
    const name = u?.displayName || u?.email || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      // If the click isn’t inside an element with [data-user-menu], close it
      if (!(e.target.closest && e.target.closest("[data-user-menu]"))) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">
          DMS
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className={active("/")}>ផ្ទាំងគ្រប់គ្រងឯកសារចូល</Link>
          {/* <Link to="/new" className={active("/new")}>បញ្ចូលឯកសារ</Link> */}
          <Link to="/dispatch" className={active("/dispatch")}>ផ្ទាំងគ្រប់គ្រងឯកសារបញ្ជូន</Link>
          <Link to="/process" className={active("/process")}>ដំណើរការ</Link>

          {!user ? (
            <Link to="/login" className={active("/login")}>
              ចូលគណនី
            </Link>
          ) : (
            <div className="relative" data-user-menu>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full overflow-hidden border border-slate-300 flex items-center justify-center bg-slate-100"
                title={user.displayName || user.email || "Account"}
                aria-label="User menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700">
                    {initialsFromUser(user)}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-3 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-700">
                          {initialsFromUser(user)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {user.displayName || "អ្នកប្រើប្រាស់"}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    {/* Placeholder for future 'Profile' page link if you add one */}
                    {/* <Link to="/profile" className="block px-2 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700">គណនី</Link> */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-red-50 text-sm text-red-600"
                    >
                      ចេញ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
