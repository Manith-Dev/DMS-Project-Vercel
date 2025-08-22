// client/src/pages/Dispatch.jsx
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { searchDocs, createDoc, updateDoc, deleteDoc } from "../lib/api.js";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";

/* ---------------- constants ---------------- */
const ADMIN = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const SPECIAL = [
  "អគ្គាធិការរង",
  "អគ្គធិការរ",
  "រដ្ឋលេខាធិការទទួលបន្ទុក",
  "អគ្គលេខាធិការដ្ឋាន",
  "រដ្ឋមន្រ្តី",
];
const ALL_DESTS = [ADMIN, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN), ...SPECIAL];

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

/* ---------------- helpers ---------------- */
const isInvalidDate = (x) => Number.isNaN(+new Date(x));
function dmy(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isInvalidDate(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function decodeLatin1ToUtf8(name) {
  if (!name) return "";
  try {
    const resc = unescape(encodeURIComponent(name));
    const utf8 = decodeURIComponent(escape(resc));
    const bad = (s) => (s.match(/\uFFFD/g) || []).length;
    return bad(utf8) <= bad(name) ? utf8 : name;
  } catch {
    try { return decodeURIComponent(escape(name)); } catch { return name; }
  }
}
const cleanFileName = (n) => decodeLatin1ToUtf8(n || "") || "file.pdf";

/* ---------------- small UI bits ---------------- */
const CounterCard = ({ icon, label, value, gradient }) => (
  <div className="rounded-2xl border bg-white overflow-hidden shadow-sm">
    <div className={`h-1.5 ${gradient}`} />
    <div className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-3xl font-semibold leading-none mt-1">{value}</div>
      </div>
    </div>
  </div>
);

/** DatePicker wrapper:
 *  - shows Khmer placeholder “ថ្ងៃ/ខែ/ឆ្នាំ” when empty
 *  - displays popup calendar
 *  - stores value as YYYY-MM-DD string
 */
function DatePickerKh({ value, onChange, className = "input", placeholder = "ថ្ងៃ/ខែ/ឆ្នាំ" }) {
  const selected = value ? new Date(value) : null;
  return (
    <DatePicker
      selected={selected}
      onChange={(d) => onChange(d ? d.toISOString().slice(0, 10) : "")}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
      isClearable
      showPopperArrow
    />
  );
}

/* ---------------- page ---------------- */
export default function Dispatch() {
  const [q, setQ] = React.useState("");
  const [date, setDate] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const [outTotal, setOutTotal] = React.useState(0);
  const [outToday, setOutToday] = React.useState(0);
  const [outMonth, setOutMonth] = React.useState(0);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState("create");
  const [editId, setEditId] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const emptyForm = {
    date: "",
    subject: "",
    summary: "",
    fromDept: "",
    sentDate: "",
    receivedAt: "",
    receivedDate: "",
    toDept: "",
    forwardedDate: "",
    note: "",
  };
  const [form, setForm] = React.useState(emptyForm);

  const [files, setFiles] = React.useState([]);
  const fileInputRef = React.useRef(null);

  const [fileMenuFor, setFileMenuFor] = React.useState(null);

  function resetForm() {
    setForm(emptyForm);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMode("create");
    setEditId(null);
  }
  function openCreate() { resetForm(); setOpen(true); }
  function openEdit(it) {
    setMode("edit");
    setEditId(it._id);
    setForm({
      date: it.date ? new Date(it.date).toISOString().slice(0, 10) : "",
      subject: it.subject || "",
      summary: it.summary || "",
      fromDept: it.fromDept || "",
      sentDate: it.sentDate ? new Date(it.sentDate).toISOString().slice(0, 10) : "",
      receivedAt: it.receivedAt || "",
      receivedDate: it.receivedDate ? new Date(it.receivedDate).toISOString().slice(0, 10) : "",
      toDept: it.toDept || "",
      forwardedDate: it.forwardedDate ? new Date(it.forwardedDate).toISOString().slice(0, 10) : "",
      note: it.routeNote || "",
    });
    setFiles([]);
    setOpen(true);
  }

  async function loadList(current = {}) {
    setLoading(true);
    try {
      const { items: list, total } = await searchDocs({
        q: current.q ?? q,
        date: current.date ?? date,
        sourceType: "outgoing",
        page: 1,
        limit: 60,
      });
      setItems(Array.isArray(list) ? list : []);
      setOutTotal(Number(total || 0));
    } finally { setLoading(false); }
  }
  async function loadCounters() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const td = await searchDocs({ sourceType: "outgoing", date: today, page: 1, limit: 1 });
      setOutToday(Number(td.total || 0));

      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23,59,59,999);
      const mon = await searchDocs({
        sourceType: "outgoing",
        dateFrom: start.toISOString().slice(0,10),
        dateTo: end.toISOString().slice(0,10),
        page: 1, limit: 1,
      });
      setOutMonth(Number(mon.total || 0));
    } catch {}
  }
  React.useEffect(() => { loadList(); loadCounters(); }, []);
  React.useEffect(() => {
    const h = setTimeout(() => { loadList({ q, date }); loadCounters(); }, 350);
    return () => clearTimeout(h);
  }, [q, date]);

  async function onSubmit(e) {
    e.preventDefault();
    const { date: docDate, subject, fromDept, toDept } = form;
    if (!docDate || !subject || !fromDept || !toDept) {
      alert("សូមបំពេញ កាលបរិច្ឆេទ / ចំណងជើង / បានបញ្ចូនពី / បានបញ្ជូនទៅ");
      return;
    }
    setSubmitting(true);
    try {
      const sentDate = form.sentDate || form.date;
      const forwardedDate = form.forwardedDate || form.date;

      const payload = {
        date: form.date,
        organization: ADMIN,
        subject: form.subject,
        summary: form.summary,
        confidential: false,
        documentType: "កំណត់បង្ហាញ",
        sourceType: "outgoing",
        fromDept: form.fromDept,
        sentDate,
        receivedAt: form.receivedAt,
        receivedDate: form.receivedDate,
        toDept: form.toDept,
        forwardedDate,
        routeNote: form.note,
      };

      if (mode === "create") await createDoc(payload, files);
      else await updateDoc(editId, payload, files);

      setOpen(false);
      resetForm();
      await Promise.all([loadList(), loadCounters()]);
    } catch (err) {
      alert(err.message || "បរាជ័យ");
    } finally { setSubmitting(false); }
  }

  async function onDelete(id) {
    if (!confirm("លុបឯកសារនេះ?")) return;
    try {
      await deleteDoc(id);
      await Promise.all([loadList(), loadCounters()]);
    } catch (e) { alert(e.message || "លុបបរាជ័យ"); }
  }

  function onDrop(e) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []).filter((f) => f.type === "application/pdf");
    if (dropped.length) setFiles(dropped);
  }

  async function downloadFile(docId, index, filename, directPath) {
    const url = `${BASE}/api/docs/${docId}/files/${index}/download?t=${Date.now()}`;
    try {
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) throw new Error((await r.text().catch(() => "")) || `HTTP ${r.status}`);
      const blob = await r.blob();
      const pdfBlob = blob.type ? blob : new Blob([blob], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pdfBlob);
      a.download = cleanFileName(filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (e) {
      if (directPath) window.location.href = (import.meta.env.VITE_API_URL || "http://localhost:5001") + directPath;
      else alert(e.message || "Download failed");
    }
  }

  return (
    <div className="grid gap-6">
      {/* Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CounterCard label="បញ្ជូនសរុប" value={outTotal}
          gradient="bg-gradient-to-r from-indigo-500 to-indigo-400"
          icon={<svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 4h16v4H4zM4 10h10v4H4zM4 16h16v4H4z" fill="#334155"/></svg>} />
        <CounterCard label="បញ្ជូនថ្ងៃនេះ" value={outToday}
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
          icon={<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 7v5l4 2" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="#334155" strokeWidth="2" fill="none"/></svg>} />
        <CounterCard label="បញ្ជូនខែនេះ" value={outMonth}
          gradient="bg-gradient-to-r from-sky-500 to-sky-400"
          icon={<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3 4h18v4H3zM3 10h18v10H3z" stroke="#334155" strokeWidth="2" fill="none"/></svg>} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">បញ្ជូនឯកសារ (ផ្ទៃក្នុង)</h1>
          <p className="text-slate-500 text-sm">បានបញ្ជូនពី → បានទទួល​នៅ → បានបញ្ជូនទៅ</p>
        </div>
        <button className="btn px-3 py-2" onClick={openCreate}>បង្កើត & បញ្ជូន</button>
      </div>

      {/* Filters */}
      <div className="sticky top-16 z-10">
        <div className="rounded-2xl border bg-white p-4 shadow-sm grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">ស្វែងរក</span>
            <input className="input" placeholder="អង្គភាព / ចំណងជើង" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">កាលបរិច្ឆេទ</span>
            <DatePickerKh value={date} onChange={setDate} />
          </label>
          <div />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-slate-600">
              <th className="px-4 py-3 text-left w-[110px]">កាលបរិច្ឆេទ</th>
              <th className="px-4 py-3 text-left">ចំណងជើង</th>
              <th className="px-4 py-3 text-left w-[220px]">បានបញ្ចូនពី</th>
              <th className="px-4 py-3 text-left w-[220px]">បានទទួល​នៅ</th>
              <th className="px-4 py-3 text-left w-[220px]">បានបញ្ចូនទៅ</th>
              <th className="px-4 py-3 text-left w-[220px]">ឯកសារ</th>
              <th className="px-4 py-3 text-left w-[180px]">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-t animate-pulse">
                <td className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-64 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-40 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-40 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-40 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-32 bg-slate-200 rounded" /></td>
                <td className="px-4 py-3"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
              </tr>
            ))}

            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">គ្មានទិន្នន័យ</td></tr>
            )}

            {!loading && items.map((it) => {
              const fArr = Array.isArray(it.files) ? it.files : [];
              const hasFiles = fArr.length > 0;
              const f0 = hasFiles ? fArr[0] : null;
              const clean0 = cleanFileName(f0?.originalName);

              return (
                <tr key={it._id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{dmy(it.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[52ch]" title={it.subject || ""}>{it.subject || "—"}</div>
                    {it.summary && <div className="text-slate-600 text-xs mt-1 line-clamp-2 max-w-[72ch]">{it.summary}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate">{it.fromDept || "—"}</div>
                    <div className="text-xs text-slate-500">{dmy(it.sentDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate">{it.receivedAt || "—"}</div>
                    <div className="text-xs text-slate-500">{dmy(it.receivedDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate">{it.toDept || "—"}</div>
                    <div className="text-xs text-slate-500">{dmy(it.forwardedDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {!hasFiles ? (
                      <span className="text-slate-400">—</span>
                    ) : fArr.length === 1 ? (
                      <button
                        className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 inline-flex items-center gap-2 max-w-full"
                        title={clean0}
                        onClick={() => downloadFile(it._id, 0, clean0, f0?.path)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round"/>
                          <path d="M4 19h16" stroke="#94a3b8" strokeWidth="2" />
                        </svg>
                        <span className="truncate">{clean0}</span>
                      </button>
                    ) : (
                      <div className="relative inline-block">
                        <button
                          className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 inline-flex items-center gap-2"
                          onClick={() => setFileMenuFor(fileMenuFor === it._id ? null : it._id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round"/>
                            <path d="M4 19h16" stroke="#94a3b8" strokeWidth="2" />
                          </svg>
                          ទាញយក ({fArr.length})
                        </button>
                        {fileMenuFor === it._id && (
                          <div className="absolute mt-2 w-64 rounded-xl border bg-white shadow-lg z-10">
                            {fArr.map((f, idx) => {
                              const nm = cleanFileName(f.originalName);
                              return (
                                <button
                                  key={idx}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 truncate"
                                  title={nm}
                                  onClick={() => {
                                    setFileMenuFor(null);
                                    downloadFile(it._id, idx, nm, f.path);
                                  }}
                                >
                                  {nm}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary px-2 py-1" onClick={() => openEdit(it)}>កែ</button>
                      <button className="btn-danger px-2 py-1" onClick={() => onDelete(it._id)}>លុប</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <form onSubmit={onSubmit} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === "create" ? "បង្កើត & បញ្ជូនឯកសារ" : "កែសម្រួលឯកសារ"}
              </h3>
              <button type="button" className="btn-secondary px-2 py-1" onClick={() => { setOpen(false); resetForm(); }}>
                បិទ
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">កាលបរិច្ឆេទឯកសារ</span>
                <DatePickerKh value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">ចំណងជើង</span>
                <input className="input" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">មាតិកាសង្ខេប</span>
              <textarea rows={3} className="input" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
            </label>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានបញ្ចូនពី</span>
                <select className="input" value={form.fromDept} onChange={(e) => setForm((f) => ({ ...f, fromDept: e.target.value }))}>
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <DatePickerKh className="input mt-2" value={form.sentDate} onChange={(v) => setForm((f) => ({ ...f, sentDate: v }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានទទួល​នៅ</span>
                <select className="input" value={form.receivedAt} onChange={(e) => setForm((f) => ({ ...f, receivedAt: e.target.value }))}>
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <DatePickerKh className="input mt-2" value={form.receivedDate} onChange={(v) => setForm((f) => ({ ...f, receivedDate: v }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានបញ្ចូនទៅ</span>
                <select className="input" value={form.toDept} onChange={(e) => setForm((f) => ({ ...f, toDept: e.target.value }))}>
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <DatePickerKh className="input mt-2" value={form.forwardedDate} onChange={(v) => setForm((f) => ({ ...f, forwardedDate: v }))} />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">កំណត់ចំណាំ (សម្រាប់ផ្លូវចរាចរ)</span>
              <input className="input" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </label>

            {/* PDF Dropzone */}
            <div className="grid gap-1">
              <span className="text-sm text-slate-600">ភ្ជាប់ PDF (ជាជម្រើស)</span>
              <div
                className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:bg-slate-100"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                title="ចុច ឬ អូសឯកសារ PDF មកទីនេះ"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M12 5v9m0 0l-3-3m3 3l3-3" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <path d="M4 17a4 4 0 014-4h8a4 4 0 010 8H8a4 4 0 01-4-4z" stroke="#94a3b8" strokeWidth="2" fill="none"/>
                  </svg>
                  បញ្ចូលឯកសារ PDF នៅទីនេះ
                </div>
                {files.length > 0 && <div className="mt-2 text-xs text-slate-500">បានជ្រើស {files.length} ឯកសារ</div>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => { setOpen(false); resetForm(); }}>
                បោះបង់
              </button>
              <button type="submit" className="btn px-4 py-2" disabled={submitting}>
                {submitting ? "កំពុងរក្សាទុក…" : (mode === "create" ? "បង្កើត & បញ្ជូន" : "រក្សាទុក")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
