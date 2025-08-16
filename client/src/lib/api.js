// client/src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function searchDocs({ q="", type="", department="", date="", page=1, limit=50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (department) params.set("department", department);
  // single date -> use both from/to for backend compatibility
  if (date) { params.set("dateFrom", date); params.set("dateTo", date); }

  const r = await fetch(`${BASE}/api/docs?` + params.toString());
  if (!r.ok) throw new Error("Failed to fetch");
  return r.json();
}

export async function getStats() {
  const r = await fetch(`${BASE}/api/stats`);
  if (!r.ok) return { totalDocs: 0, receivedToday: 0, withFiles: 0, byType: [] };
  return r.json();
}

export async function getDoc(id) {
  const r = await fetch(`${BASE}/api/docs/${id}`);
  if (!r.ok) throw new Error("Not found");
  return r.json();
}

export async function createDoc(values, files=[]) {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  (files || []).forEach(f => fd.append("files", f));

  const r = await fetch(`${BASE}/api/docs`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Create failed");
  return r.json();
}

export async function updateDoc(id, values, files=[]) {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  (files || []).forEach(f => fd.append("files", f));

  const r = await fetch(`${BASE}/api/docs/${id}`, { method: "PUT", body: fd });
  if (!r.ok) throw new Error("Update failed");
  return r.json();
}

export async function deleteDoc(id) {
  const r = await fetch(`${BASE}/api/docs/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Delete failed");
  return r.json();
}
