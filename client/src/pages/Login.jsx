import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

export default function Login() {
  const nav = useNavigate();
  const { user, loading, loginWithGoogle } = useAuth();
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      // already signed in -> go home
      nav("/", { replace: true });
    }
  }, [loading, user, nav]);

  async function handleGoogle() {
    setErr("");
    setBusy(true);
    try {
      await loginWithGoogle();
      // AuthProvider will update `user`, effect above will redirect
    } catch (e) {
      setErr(e?.message || "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="card p-6 grid gap-4 max-w-md w-full"
      >
        <h2 className="text-xl font-semibold text-center">ចូលប្រើប្រាស់</h2>

        {/* Message */}
        <p className="text-sm text-slate-600 text-center">
          សូមចូលប្រើប្រាស់ជាមួយ Google (Gmail) ប៉ុណ្ណោះ
        </p>

        {err && <div className="text-sm text-red-600 text-center">{err}</div>}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy || loading}
          className="btn flex items-center justify-center gap-2"
        >
          {busy ? "កំពុងភ្ជាប់..." : "ចូលប្រើប្រាស់ជាមួយ Google"}
        </button>
      </form>
    </div>
  );
}
