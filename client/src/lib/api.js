// client/src/lib/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// Small helper to fetch+JSON with useful errors
async function jfetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data && (data.error || data.message)) msg = data.error || data.message;
    } catch {
      try { msg = await res.text(); } catch {}
    }
    throw new Error(msg || "Request failed");
  }
  return res.json();
}

export async function searchDocs({
  q = "",
  type = "",
  department = "",
  date = "",
  stage = "",
  sourceType = "",
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams({ page, limit });

  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (department) params.set("department", department);
  if (stage) params.set("stage", stage);
  if (sourceType) params.set("sourceType", sourceType);

  // Backward compatibility: some server builds expect `date`, others `dateFrom/dateTo`
  if (date) {
    params.set("date", date);
    params.set("dateFrom", date);
    params.set("dateTo", date);
  }

  return jfetch(`${BASE}/api/docs?${params.toString()}`);
}

// UPDATED: allow querying stats with sourceType
export async function getStats({ sourceType = "" } = {}) {
  const params = new URLSearchParams();
  if (sourceType) params.set("sourceType", sourceType);
  try {
    return await jfetch(`${BASE}/api/stats?${params.toString()}`);
  } catch {
    return { totalDocs: 0, receivedToday: 0, withFiles: 0, byType: [] };
  }
}

export async function getDoc(id) {
  return jfetch(`${BASE}/api/docs/${id}`);
}

export async function createDoc(values, files = []) {
  const fd = new FormData();
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  (files || []).forEach((f) => fd.append("files", f));
  return jfetch(`${BASE}/api/docs`, { method: "POST", body: fd });
}

export async function updateDoc(id, values, files = []) {
  const fd = new FormData();
  Object.entries(values || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  (files || []).forEach((f) => fd.append("files", f));
  return jfetch(`${BASE}/api/docs/${id}`, { method: "PUT", body: fd });
}

export async function deleteDoc(id) {
  return jfetch(`${BASE}/api/docs/${id}`, { method: "DELETE" });
}

export async function setStage(id, { stage, note = "", at } = {}) {
  const token = localStorage.getItem("token") || "";
  const body = { stage, note };
  if (at) body.at = at; // ISO string recommended

  return jfetch(`${BASE}/api/docs/${id}/stage`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function getJourney(id) {
  const data = await jfetch(`${BASE}/api/docs/${id}/journey`);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.history)) return data.history;
  return [];
}

export async function getOutgoingStats() {
  return getStats(); // same endpoint; now includes outgoing fields
}


