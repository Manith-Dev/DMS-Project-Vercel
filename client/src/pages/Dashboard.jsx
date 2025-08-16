// client/src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { searchDocs, getStats, deleteDoc } from "../lib/api.js";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const priorityToKh = { Low: "ធម្មតា", Normal: "ប្រញាប់", High: "បន្ទាន់" };
const CHART_COLORS = [
  "#5B7CF7",
  "#34D399",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#A855F7",
];

function formatDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d)) return "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// Fix legacy garbled names from old uploads (latin1 shown as utf8)
function fixLegacyName(name) {
  try {
    const decoded = decodeURIComponent(escape(String(name)));
    return decoded && decoded !== name ? decoded : name;
  } catch {
    return name;
  }
}

// Truncate base name to max chars (keep extension)
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

  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState(null);

  const chartData = React.useMemo(() => {
    const arr = Array.isArray(stats?.byType) ? stats.byType : [];
    return arr.map((d) => ({
      name: d.name ?? "",
      value: Number(d.value) || 0,
    }));
  }, [stats]);

  async function load() {
    setLoading(true);
    try {
      const [{ items: list }, s] = await Promise.all([
        searchDocs({ q, type, dateFrom, dateTo, page: 1, limit: 50 }),
        getStats(),
      ]);
      setItems(list || []);
      setStats(s || null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    await load();
  }

  async function onDelete(id) {
    if (!confirm("លុបឯកសារនេះ?")) return;
    await deleteDoc(id);
    await load();
  }

  // Robust download: GET blob, then save. Fallback to static path on error.
  async function downloadFile(docId, index, filename, directPath) {
    const base = import.meta.env.VITE_API_URL || "http://localhost:5001";
    const url = `${base}/api/docs/${docId}/files/${index}/download`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        // try to read JSON error for debugging
        let msg = "Download failed";
        try {
          const j = await r.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "file.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (e) {
      // fallback: open static file path
      if (directPath) {
        window.open(
          (import.meta.env.VITE_API_URL || "http://localhost:5001") +
            directPath,
          "_self"
        );
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

      {/* Stats + Chart */}
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
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="text-sm grid gap-2">
              {chartData.length === 0 && (
                <li className="text-slate-500">គ្មានទិន្នន័យ</li>
              )}
              {chartData.map((d, i) => (
                <li key={d.name + i} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
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
      <form onSubmit={onSearch} className="card p-4 grid md:grid-cols-4 gap-3">
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
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">ទាំងអស់</option>
            <option value="កំណត់បង្ហាញ">កំណត់បង្ហាញ</option>
            <option value="កំណត់ហេតុ">កំណត់ហេតុ</option>
            <option value="របាយការណ៍">របាយការណ៍</option>
            <option value="របាយការណ៍លទ្ធផលអង្កេត">របាយការណ៍លទ្ធផលអង្កេត</option>
            <option value="សំណើរសុំគោលការណ៍">សំណើរសុំគោលការណ៍</option>
            <option value="សំណើរសុំគោលការណ៍អង្កេត">
              សំណើរសុំគោលការណ៍អង្កេត
            </option>
          </select>
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-slate-600">ចាប់ពីកាលបរិច្ឆេទ</label>
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-slate-600">ដល់កាលបរិច្ឆេទ</label>
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </form>

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
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  គ្មានទិន្នន័យ
                </td>
              </tr>
            )}

            {items.map((it) => {
              const f0 =
                Array.isArray(it.files) && it.files.length > 0
                  ? it.files[0]
                  : null;
              const fullName = f0
                ? fixLegacyName(f0.originalName || "PDF")
                : null;
              const shortName = fullName
                ? truncateFileName(fullName, 10)
                : null;

              return (
                <tr key={it._id} className="border-t">
                  <td className="px-4 py-2">{formatDate(it.date)}</td>
                  <td className="px-4 py-2">{it.organization || "-"}</td>
                  <td
                    className="px-4 py-2 max-w-[36ch] truncate"
                    title={it.subject}
                  >
                    {it.subject || "-"}
                  </td>
                  <td className="px-4 py-2">{it.department || "-"}</td>

                  <td className="px-4 py-2">
                    <PriorityBadge value={it.priority} />
                  </td>

                  <td className="px-4 py-2">
                    {f0 ? (
                      <a
                        className="text-indigo-600 hover:underline max-w-[24ch] inline-block truncate"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          downloadFile(it._id, 0, fullName, f0.path);
                        }}
                        title={fullName}
                      >
                        {shortName}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-4 py-2 flex items-center gap-2">
                    <td className="px-4 py-2 flex items-center gap-2">
                      <button
                        className="btn-secondary px-2 py-1"
                        onClick={() => nav(`/edit/${it._id}`)}
                      >
                        កែ
                      </button>
                      <button
                        className="btn-danger px-2 py-1"
                        onClick={() => onDelete(it._id)}
                      >
                        លុប
                      </button>
                    </td>
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
      <div className="absolute top-3 left-4 text-sm text-slate-600">
        {label}
      </div>
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-3xl md:text-4xl font-semibold leading-none">
          {value ?? 0}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ value }) {
  const kh =
    { Low: "ធម្មតា", Normal: "ប្រញាប់", High: "បន្ទាន់" }[value] ??
    value ??
    "-";
  let cls = "bg-slate-100 text-slate-800";
  if (value === "Normal" || value === "ប្រញាប់")
    cls = "bg-amber-100 text-amber-800";
  if (value === "High" || value === "បន្ទាន់") cls = "bg-red-100 text-red-800";
  if (value === "Low" || value === "ធម្មតា")
    cls = "bg-slate-100 text-slate-800";
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{kh}</span>;
}
