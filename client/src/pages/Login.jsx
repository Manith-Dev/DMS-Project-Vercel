import React from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api.js";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const { token, role, department } = await login({ email, password });
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("department", department || "");
      nav("/");
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 grid gap-3 max-w-md mx-auto">
      <h2 className="text-xl font-semibold">ចូលគណនី</h2>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">អ៊ីមែល</span>
        <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">ពាក្យសម្ងាត់</span>
        <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      </label>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button className="btn">ចូល</button>
    </form>
  );
}
