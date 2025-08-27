// client/src/lib/apiFetch.js
export async function apiFetch(path, opts = {}, token) {
  const headers = new Headers(opts.headers || {});

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
