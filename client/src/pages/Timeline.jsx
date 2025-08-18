import React from "react";
import { useParams } from "react-router-dom";
import { getDoc } from "../lib/api.js";

export default function Timeline(){
  const { id } = useParams();
  const [doc, setDoc] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try { setDoc(await getDoc(id)); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="card p-4">កំពុងផ្ទុក…</div>;
  if (!doc) return <div className="card p-4">មិនមានទិន្នន័យ</div>;

  return (
    <div className="card p-6 grid gap-4">
      <h2 className="text-xl font-semibold">ប្រវត្តិដំណាក់កាល</h2>
      <div className="grid gap-2">
        {(doc.history || []).slice().reverse().map((h, i) => (
          <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">{h.stage}</span>
              <span className="text-slate-600 text-sm">{h.note || "—"}</span>
            </div>
            <div className="text-sm text-slate-500">
              {new Date(h.at).toLocaleString()} • {h.actorDept || "-"} ({h.actorRole || "-"})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
