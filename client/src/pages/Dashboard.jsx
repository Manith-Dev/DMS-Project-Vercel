// client/src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { searchDocs, getStats, deleteDoc } from "../lib/api.js";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { departments } from "../data/options.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

// Map stored values → Khmer labels (works for EN or KH stored values)
const priorityToKh = { Low: "ធម្មតា", Normal: "ប្រញាប់", High: "បន្ទាន់" };

// Colors for the donut
const CHART_COLORS = ["#5B7CF7", "#34D399", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7"];

// strict DD/MM/YYYY formatter
function formatDate(dateString) {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return "";
  }
}

// Fix legacy garbled names (latin1 shown as utf8 from older uploads)
function fixLegacyName(name) {
  try {
    const decoded = decodeURIComponent(escape(String(name)));
    return decoded && decoded !== name ? decoded : name;
  } catch {
    return name;
  }
}

// Truncate base name to N chars, keep extension
function truncateFileName(name, max = 10) {
  if (!name) return "PDF";
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  if (base.length <= max) return name;
  return base.slice(0, max) + "…" + ext;
}

export default function Dashboard() {
  const nav = useNavigate();

  // filters (auto-search)
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [date, setDate] = React.useState("");

  // data
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState(null);

  const chartData = React.useMemo(() => {
    const arr = Array.isArray(stats?.byType) ? stats.byType : [];
    return arr.map((d) => ({ name: d.name ?? "", value: Number(d.value) || 0 }));
  }, [stats]);

  async function load(current = {}) {
    setLoading(true);
    try {
      const [{ items: list }, s] = await Promise.all([
        searchDocs({
          q: current.q ?? q,
          type: current.type ?? type,
          department: current.dept ?? dept,
          date: current.date ?? date,
          page: 1,
          limit: 50,
          // IMPORTANT: do NOT pass sourceType here.
          // We’ll filter on the client to keep “បញ្ចូលឯកសារ” and drop only “បញ្ជូនឯកសារ”.
        }),
        getStats(),
      ]);

      // Keep everything EXCEPT sourceType === "outgoing"
      const filtered =
        (list || []).filter(
          (it) => (it.sourceType || "").toLowerCase() !== "outgoing"
        );

      setItems(filtered);
      setStats(s || null);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // auto-search on input (debounce 400ms)
  React.useEffect(() => {
    const h = setTimeout(() => { load({ q, type, dept, date }); }, 400);
    return () => clearTimeout(h);
  }, [q, type, dept, date]);

  async function onDelete(id) {
    if (!confirm("លុបឯកសារនេះ?")) return;
    await deleteDoc(id);
    await load();
  }

  async function downloadFile(docId, index, filename, directPath) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5001";
    const url = `${base}/api/docs/${docId}/files/${index}/download?t=${Date.now()}`;
    try {
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const pdfBlob = blob.type ? blob : new Blob([blob], { type: "application/pdf" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(pdfBlob);
      a.download = filename || "file.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (e) {
      if (directPath) {
        window.location.href = (import.meta.env.VITE_API_URL || "http://localhost:5001") + directPath;
      } else {
        alert(e.message || "Download failed");
      }
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ឯកសារថ្មីៗ</h1>
      </div>

      {/* Stats + Big Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <StatCard label="ឯកសារទាំងអស់" value={stats?.totalDocs ?? 0} />
        <StatCard label="ទទួលបានថ្ងៃនេះ" value={stats?.receivedToday ?? 0} />
        <StatCard label="មានឯកសារ PDF" value={stats?.withFiles ?? 0} />

        <div className="card p-4 overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={74}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    labelLine={false}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="text-sm grid gap-2">
              {chartData.length === 0 && <li className="text-slate-500">គ្មានទិន្នន័យ</li>}
              {chartData.map((d, i) => (
                <li key={d.name + i} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="whitespace-nowrap">
                    {d.name} <span className="text-slate-500">= {d.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid md:grid-cols-4 gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-slate-600">ស្វែងរក</label>
          <input
            className="input"
            placeholder="អង្គភាព / ចំណងជើង / សង្ខេប"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-slate-600">ប្រភេទឯកសារ</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">ទាំងអស់</option>
            <option value="កំណត់បង្ហាញ">កំណត់បង្ហាញ</option>
            <option value="កំណត់ហេតុ">កំណត់ហេតុ</option>
            <option value="របាយការណ៍">របាយការណ៍</option>
            <option value="របាយការណ៍លទ្ធផលអង្កេត">របាយការណ៍លទ្ធផលអង្កេត</option>
            <option value="សំណើរសុំគោលការណ៍">សំណើរសុំគោលការណ៍</option>
            <option value="សំណើរសុំគោលការណ៍អង្កេត">សំណើរសុំគោលការណ៍អង្កេត</option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-slate-600">នាយកដ្ឋាន</label>
          <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">ទាំងអស់</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-slate-600">កាលបរិច្ឆេទ</label>
          <DatePicker
            selected={date ? new Date(date) : null}
            onChange={(d) => setDate(d ? d.toISOString().slice(0, 10) : "")}
            dateFormat="dd/MM/yyyy"
            placeholderText="ថ្ងៃ/ខែ/ឆ្នាំ"
            className="input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-slate-600">
              <th className="px-4 py-2 text-left">កាលបរិច្ឆេទ</th>
              <th className="px-4 py-2 text-left">អង្គភាព</th>
              <th className="px-4 py-2 text-left">ចំណងជើង</th>
              <th className="px-4 py-2 text-left">នាយកដ្ឋាន</th>
              <th className="px-4 py-2 text-left">កម្រិត</th>
              <th className="px-4 py-2 text-left">ឯកសារ</th>
              <th className="px-4 py-2 text-left">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {loading ? "កំពុងផ្ទុក…" : "គ្មានទិន្នន័យ"}
                </td>
              </tr>
            )}

            {items.map((it) => {
              const hasFile = Array.isArray(it.files) && it.files.length > 0;
              const f0 = hasFile ? it.files[0] : null;
              const fullName = hasFile ? fixLegacyName(f0.originalName || "PDF") : null;
              const shortName = hasFile ? truncateFileName(fullName, 10) : null;

              return (
                <tr key={it._id} className="border-t">
                  <td className="px-4 py-2">{formatDate(it.date)}</td>
                  <td className="px-4 py-2">{it.organization || "-"}</td>
                  <td className="px-4 py-2 max-w-[36ch] truncate" title={it.subject}>
                    {it.subject || "-"}
                  </td>
                  <td className="px-4 py-2">{it.department || "-"}</td>
                  <td className="px-4 py-2"><PriorityBadge value={it.priority} /></td>
                  <td className="px-4 py-2">
                    {hasFile ? (
                      <a
                        className="text-indigo-600 hover:underline max-w-[24ch] inline-block truncate"
                        href="#"
                        onClick={(e) => { e.preventDefault(); downloadFile(it._id, 0, fullName, f0.path); }}
                        title={fullName}
                      >
                        {shortName}
                      </a>
                    ) : ("—")}
                  </td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <button className="btn-secondary px-2 py-1" onClick={() => nav(`/edit/${it._id}`)}>កែ</button>
                    <button className="btn-danger px-2 py-1" onClick={() => onDelete(it._id)}>លុប</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- small components ---------- */
function StatCard({ label, value }) {
  return (
    <div className="card relative h-28">
      <div className="absolute top-3 left-4 text-sm text-slate-600">{label}</div>
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-3xl md:text-4xl font-semibold leading-none">{value ?? 0}</div>
      </div>
    </div>
  );
}

function PriorityBadge({ value }) {
  const kh = priorityToKh[value] ?? value ?? "-";
  let clsName = "bg-slate-100 text-slate-800";
  if (value === "Normal" || value === "ប្រញាប់") clsName = "bg-amber-100 text-amber-800";
  if (value === "High" || value === "បន្ទាន់") clsName = "bg-red-100 text-red-800";
  if (value === "Low" || value === "ធម្មតា") clsName = "bg-slate-100 text-slate-800";
  return <span className={`px-2 py-0.5 rounded text-xs ${clsName}`}>{kh}</span>;
}
