// client/src/pages/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { searchDocs, getStats, deleteDoc, createDoc } from "../lib/api.js";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { departments } from "../data/options.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

/* ---------------- constants ---------------- */
const priorityToKh = { Low: "ធម្មតា", Normal: "ប្រញាប់", High: "បន្ទាន់" };
const CHART_COLORS = [
  "#5B7CF7",
  "#34D399",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#A855F7",
];
const SOURCE_TYPE = "incoming"; // Dashboard is ONLY for បញ្ចូលឯកសារ
const ORG_OPTIONS = ["ក្រសួងមហាផ្ទៃ", "អង្គភាពខាងក្រៅ"];

/* ---------------- helpers ---------------- */
function formatDate(s) {
  try {
    return s ? format(new Date(s), "dd/MM/yyyy") : "";
  } catch {
    return "";
  }
}
function fixLegacyName(n) {
  try {
    const d = decodeURIComponent(escape(String(n)));
    return d && d !== n ? d : n;
  } catch {
    return n;
  }
}
function truncateFileName(n, m = 10) {
  if (!n) return "PDF";
  const i = n.lastIndexOf("."),
    b = i > 0 ? n.slice(0, i) : n,
    e = i > 0 ? n.slice(i) : "";
  return b.length <= m ? n : b.slice(0, m) + "…" + e;
}

/* ========================================================================== */
/*                              Dropzone component                            */
/* ========================================================================== */
function PdfDropzone({ files, setFiles }) {
  const inputRef = React.useRef(null);
  const [over, setOver] = React.useState(false);

  function onSelect(e) {
    const arr = Array.from(e.target.files || []);
    setFiles(arr);
  }
  function onDrop(e) {
    e.preventDefault();
    setOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    // accept only PDFs
    const pdfs = dropped.filter(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name)
    );
    if (pdfs.length) setFiles(pdfs);
  }

  return (
    <div className="grid gap-1">
      <span className="text-sm text-slate-600">ឯកសារ PDF</span>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={[
          "w-full rounded-lg border-2 border-dashed px-4 py-14 text-center transition-colors cursor-pointer",
          over
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 bg-slate-50",
        ].join(" ")}
      >
        {files.length === 0 ? (
          <div className="text-slate-600">
            បញ្ចូលឯកសារ PDF នៅទីនេះ:
            <div className="text-xs text-slate-500 mt-1">
              (ចុច ឬ អូសទៅទីនេះ)
            </div>
          </div>
        ) : (
          <div className="text-left max-w-full mx-auto">
            <div className="text-sm font-medium mb-1">
              ឯកសារបានជ្រើស ({files.length})
            </div>
            <ul className="text-sm list-disc pl-5 space-y-0.5">
              {files.slice(0, 5).map((f, i) => (
                <li key={i} className="truncate">
                  {f.name}
                </li>
              ))}
              {files.length > 5 && (
                <li className="text-slate-500">… បន្ថែម​ទៀត</li>
              )}
            </ul>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={onSelect}
        />
      </div>
    </div>
  );
}

/* ========================================================================== */
/*                             CREATE MODAL (inline)                          */
/* ========================================================================== */
function CreateIncomingModal({ open, onClose, onCreated }) {
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState({
    date: "",
    organization: "", // will be from dropdown
    department: "",
    priority: "Normal",
    subject: "",
    summary: "",
    remarks: "",
    confidential: false,
    documentType: "កំណត់បង្ហាញ",
  });
  const [files, setFiles] = React.useState([]);

  React.useEffect(() => {
    if (!open) {
      setForm({
        date: "",
        organization: "",
        department: "",
        priority: "Normal",
        subject: "",
        summary: "",
        remarks: "",
        confidential: false,
        documentType: "កំណត់បង្ហាញ",
      });
      setFiles([]);
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (!form.date || !form.organization || !form.department || !form.subject) {
      alert("សូមបំពេញ កាលបរិច្ឆេទ / អង្គភាព / នាយកដ្ឋាន / ចំណងជើង");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        organization: form.organization,
        department: form.department,
        priority: form.priority,
        subject: form.subject,
        summary: form.summary,
        remarks: form.remarks,
        confidential: form.confidential,
        documentType: form.documentType || "កំណត់បង្ហាញ",
        sourceType: SOURCE_TYPE, // IMPORTANT
      };
      await createDoc(payload, files);
      onCreated?.();
      onClose();
    } catch (err) {
      alert(err.message || "បន្ថែមបរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg w-full max-w-5xl p-6 grid gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">បញ្ចូលឯកសារ (Incoming)</h3>
          <button
            type="button"
            className="btn-secondary px-3 py-1"
            onClick={onClose}
          >
            បិទ
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">កាលបរិច្ឆេទ</span>
            <DatePicker
              selected={form.date ? new Date(form.date) : null}
              onChange={(d) =>
                setForm((f) => ({
                  ...f,
                  date: d ? d.toISOString().slice(0, 10) : "",
                }))
              }
              dateFormat="dd/MM/yyyy"
              placeholderText="ថ្ងៃ/ខែ/ឆ្នាំ"
              className="input"
            />
          </label>

          {/* Organization as dropdown */}
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">អង្គភាព/Organization</span>
            <select
              className="input"
              value={form.organization}
              onChange={(e) =>
                setForm((f) => ({ ...f, organization: e.target.value }))
              }
            >
              <option value="">-- ជ្រើសរើស --</option>
              {ORG_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-600">កម្រិត/Priority</span>
            <select
              className="input"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              <option value="Low">ធម្មតា</option>
              <option value="Normal">ប្រញាប់</option>
              <option value="High">បន្ទាន់</option>
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">ប្រភេទឯកសារ</span>
            <select
              className="input"
              value={form.documentType}
              onChange={(e) =>
                setForm((f) => ({ ...f, documentType: e.target.value }))
              }
            >
              <option value="កំណត់បង្ហាញ">កំណត់បង្ហាញ</option>
              <option value="កំណត់ហេតុ">កំណត់ហេតុ</option>
              <option value="របាយការណ៍">របាយការណ៍</option>
              <option value="របាយការណ៍លទ្ធផលអង្កេត">
                របាយការណ៍លទ្ធផលអង្កេត
              </option>
              <option value="សំណើរសុំគោលការណ៍">សំណើរសុំគោលការណ៍</option>
              <option value="សំណើរសុំគោលការណ៍អង្កេត">
                សំណើរសុំគោលការណ៍អង្កេត
              </option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-slate-600">នាយកដ្ឋាន/Department</span>
            <select
              className="input"
              value={form.department}
              onChange={(e) =>
                setForm((f) => ({ ...f, department: e.target.value }))
              }
            >
              <option value="">-- ជ្រើសរើស --</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">ចំណងជើង/Subject</span>
          <input
            className="input"
            value={form.subject}
            onChange={(e) =>
              setForm((f) => ({ ...f, subject: e.target.value }))
            }
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">សេចក្ដីសង្ខេប/Summary</span>
          <textarea
            rows={3}
            className="input"
            value={form.summary}
            onChange={(e) =>
              setForm((f) => ({ ...f, summary: e.target.value }))
            }
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">កំណត់ចំណាំ/Remarks</span>
          <textarea
            rows={3}
            className="input"
            value={form.remarks}
            onChange={(e) =>
              setForm((f) => ({ ...f, remarks: e.target.value }))
            }
          />
        </label>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.confidential}
            onChange={(e) =>
              setForm((f) => ({ ...f, confidential: e.target.checked }))
            }
          />
          <span className="text-sm text-slate-700">សម្ងាត់ / Confidential</span>
        </label>

        {/* Pretty PDF dropzone */}
        <PdfDropzone files={files} setFiles={setFiles} />

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="btn-secondary px-3 py-2"
            onClick={onClose}
          >
            បោះបង់
          </button>
          <button type="submit" className="btn px-4 py-2" disabled={submitting}>
            {submitting ? "កំពុងរក្សាទុក…" : "រក្សាទុក"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ========================================================================== */
/*                               DASHBOARD PAGE                               */
/* ========================================================================== */
export default function Dashboard() {
  const nav = useNavigate();

  // filters
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [date, setDate] = React.useState("");

  // data
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState(null);

  // modal
  const [openCreate, setOpenCreate] = React.useState(false);

  // derived stats fallback (incoming-only)
  const derivedStats = React.useMemo(() => {
    const rows = (items || []).filter(
      (it) => (it.sourceType || "") === SOURCE_TYPE
    );
    const totalDocs = rows.length;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const receivedToday = rows.filter(
      (r) => new Date(r.createdAt || r.date || 0) >= startOfToday
    ).length;
    const withFiles = rows.filter(
      (r) => Array.isArray(r.files) && r.files.length > 0
    ).length;
    const byTypeMap = new Map();
    rows.forEach((r) => {
      const t = r.documentType || "";
      byTypeMap.set(t, (byTypeMap.get(t) || 0) + 1);
    });
    const byType = [...byTypeMap.entries()].map(([name, value]) => ({
      name,
      value,
    }));
    return { totalDocs, receivedToday, withFiles, byType };
  }, [items]);

  const chartData = React.useMemo(() => {
    const src =
      Array.isArray(stats?.byType) && stats?.__scoped === SOURCE_TYPE
        ? stats.byType
        : derivedStats.byType;
    return src.map((d) => ({
      name: d.name ?? "",
      value: Number(d.value) || 0,
    }));
  }, [stats, derivedStats]);

  const topCounts = React.useMemo(() => {
    const s = stats && stats.__scoped === SOURCE_TYPE ? stats : derivedStats;
    return {
      totalDocs: s.totalDocs,
      receivedToday: s.receivedToday,
      withFiles: s.withFiles,
    };
  }, [stats, derivedStats]);

  async function load(current = {}) {
    setLoading(true);
    try {
      const [{ items: list }, s] = await Promise.all([
        searchDocs({
          q: current.q ?? q,
          type: current.type ?? type,
          department: current.dept ?? dept,
          date: current.date ?? date,
          sourceType: SOURCE_TYPE,
          page: 1,
          limit: 50,
        }),
        getStats({ sourceType: SOURCE_TYPE }),
      ]);

      let rows = (list || []).filter(
        (it) => (it.sourceType || "") === SOURCE_TYPE
      );
      const wantDept = current.dept ?? dept;
      if (wantDept)
        rows = rows.filter((it) => (it.department || "") === wantDept);

      setItems(rows);
      setStats({ ...(s || {}), __scoped: SOURCE_TYPE });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);
  React.useEffect(() => {
    const h = setTimeout(() => load({ q, type, dept, date }), 400);
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
      if (!r.ok)
        throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
      const blob = await r.blob();
      const pdfBlob = blob.type
        ? blob
        : new Blob([blob], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pdfBlob);
      a.download = filename || "file.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (e) {
      if (directPath) {
        window.location.href =
          (import.meta.env.VITE_API_URL || "http://localhost:5001") +
          directPath;
      } else {
        alert(e.message || "Download failed");
      }
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header with Quick-Create button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ឯកសារថ្មីៗ</h1>
        <button className="btn px-3 py-2" onClick={() => setOpenCreate(true)}>
          បញ្ចូលឯកសារ
        </button>
      </div>

      {/* Stats + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <StatCard label="ឯកសារទាំងអស់" value={topCounts.totalDocs} />
        <StatCard label="ទទួលបានថ្ងៃនេះ" value={topCounts.receivedToday} />
        <StatCard label="មានឯកសារ PDF" value={topCounts.withFiles} />
        <div className="card p-4 overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                    {d.name || "មិនកំណត់"}{" "}
                    <span className="text-slate-500">= {d.value}</span>
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
          <label className="text-sm text-slate-600">នាយកដ្ឋាន</label>
          <select
            className="input"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option value="">ទាំងអស់</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
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
              <th className="px-4 py-2 text-left">បានទទួលពីនាយកដ្ឋាន</th>
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
                  {loading ? "កំពុងផ្ទុក…" : "គ្មានទិន្នន័យ"}
                </td>
              </tr>
            )}

            {items.map((it) => {
              const hasFile = Array.isArray(it.files) && it.files.length > 0;
              const f0 = hasFile ? it.files[0] : null;
              const fullName = hasFile
                ? fixLegacyName(f0.originalName || "PDF")
                : null;
              const shortName = hasFile ? truncateFileName(fullName, 10) : null;

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
                    {hasFile ? (
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <CreateIncomingModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => load()}
      />
    </div>
  );
}

/* ---------- tiny components ---------- */
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
  const kh = priorityToKh[value] ?? value ?? "-";
  let cls = "bg-slate-100 text-slate-800";
  if (value === "Normal" || value === "ប្រញាប់")
    cls = "bg-amber-100 text-amber-800";
  if (value === "High" || value === "បន្ទាន់") cls = "bg-red-100 text-red-800";
  if (value === "Low" || value === "ធម្មតា")
    cls = "bg-slate-100 text-slate-800";
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{kh}</span>;
}
