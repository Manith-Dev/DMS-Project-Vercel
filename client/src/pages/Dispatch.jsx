// client/src/pages/Dispatch.jsx
import React from "react";
import { Link } from "react-router-dom";
import {
  searchDocs,
  createDoc,
  updateDoc,
  deleteDoc,
} from "../lib/api.js";
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

/* ---------------- helpers ---------------- */
function isInvalidDate(x) { return Number.isNaN(+new Date(x)); }
function dmy(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isInvalidDate(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const Chip = ({ label, value, date, color = "emerald" }) => (
  <div
    className={`rounded-xl border px-3 py-2 min-w-[180px] bg-${color}-50/40 border-${color}-200`}
  >
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className="text-sm font-medium truncate" title={value || "—"}>
      {value || "—"}
    </div>
    <div className="text-[11px] text-slate-500">{dmy(date)}</div>
  </div>
);

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

const Kebab = ({ open, onToggle }) => (
  <button
    className="rounded-md p-1.5 hover:bg-slate-100"
    onClick={onToggle}
    aria-label="menu"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2" fill="#334155" />
      <circle cx="12" cy="12" r="2" fill="#334155" />
      <circle cx="19" cy="12" r="2" fill="#334155" />
    </svg>
  </button>
);

/* ---------------- page ---------------- */
export default function Dispatch() {
  /* filters & list */
  const [q, setQ] = React.useState("");
  const [date, setDate] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  /* counters */
  const [outTotal, setOutTotal] = React.useState(0);
  const [outToday, setOutToday] = React.useState(0);
  const [outMonth, setOutMonth] = React.useState(0);

  /* modal + form */
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState("create"); // 'create' | 'edit'
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

  /* files */
  const [files, setFiles] = React.useState([]);
  const fileInputRef = React.useRef(null);

  /* menu */
  const [menuFor, setMenuFor] = React.useState(null);

  function resetForm() {
    setForm(emptyForm);
    setFiles([]);
    fileInputRef.current && (fileInputRef.current.value = "");
    setMode("create");
    setEditId(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

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

  /* load list */
  async function loadList(current = {}) {
    setLoading(true);
    try {
      const { items: list } = await searchDocs({
        q: current.q ?? q,
        date: current.date ?? date,
        sourceType: "outgoing",
        page: 1,
        limit: 60,
      });
      setItems(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }

  /* load counters */
  async function loadCounters() {
    try {
      const total = await searchDocs({ sourceType: "outgoing", page: 1, limit: 1 });
      setOutTotal(Number(total.total || 0));

      const today = new Date().toISOString().slice(0, 10);
      const td = await searchDocs({ sourceType: "outgoing", date: today, page: 1, limit: 1 });
      setOutToday(Number(td.total || 0));

      const start = new Date();
      start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23,59,59,999);
      const mon = await searchDocs({
        sourceType: "outgoing",
        dateFrom: start.toISOString().slice(0,10),
        dateTo: end.toISOString().slice(0,10),
        page: 1,
        limit: 1,
      });
      setOutMonth(Number(mon.total || 0));
    } catch {
      // ignore soft counter errors
    }
  }

  React.useEffect(() => { loadList(); loadCounters(); }, []);
  React.useEffect(() => {
    const h = setTimeout(() => { loadList({ q, date }); loadCounters(); }, 350);
    return () => clearTimeout(h);
  }, [q, date]);

  /* submit (create/update) */
  async function onSubmit(e) {
    e.preventDefault();
    const { date: docDate, subject, fromDept, toDept } = form;
    if (!docDate || !subject || !fromDept || !toDept) {
      alert("សូមបំពេញ កាលបរិច្ឆេទ / ចំណងជើង / បានបញ្ចូនពី / បានបញ្ចូនទៅ");
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

      if (mode === "create") {
        await createDoc(payload, files);
      } else {
        await updateDoc(editId, payload, files);
      }

      setOpen(false);
      resetForm();
      await Promise.all([loadList(), loadCounters()]);
    } catch (err) {
      alert(err.message || "បរាជ័យ");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("លុបឯកសារនេះ?")) return;
    try {
      await deleteDoc(id);
      await Promise.all([loadList(), loadCounters()]);
    } catch (e) {
      alert(e.message || "លុបបរាជ័យ");
    }
  }

  /* dropzone */
  function onDrop(e) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type === "application/pdf"
    );
    if (dropped.length) setFiles(dropped);
  }

  /* --------------- UI --------------- */
  return (
    <div className="grid gap-6">
      {/* Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CounterCard
          label="បញ្ជូនសរុប"
          value={outTotal}
          gradient="bg-gradient-to-r from-indigo-500 to-indigo-400"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" className="text-slate-700">
              <path d="M4 4h16v4H4zM4 10h10v4H4zM4 16h16v4H4z" fill="#334155" />
            </svg>
          }
        />
        <CounterCard
          label="បញ្ជូនថ្ងៃនេះ"
          value={outToday}
          gradient="bg-gradient-to-r from-emerald-500 to-emerald-400"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M12 7v5l4 2" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="#334155" strokeWidth="2" fill="none"/>
            </svg>
          }
        />
        <CounterCard
          label="បញ្ជូនខែនេះ"
          value={outMonth}
          gradient="bg-gradient-to-r from-sky-500 to-sky-400"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M3 4h18v4H3zM3 10h18v10H3z" stroke="#334155" strokeWidth="2" fill="none" />
            </svg>
          }
        />
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">បញ្ជូនឯកសារ (ផ្ទៃក្នុង)</h1>
          <p className="text-slate-500 text-sm">បានបញ្ចូនពី → បានទទួល​នៅ → បានបញ្ចូនទៅ</p>
        </div>
        <button className="btn px-3 py-2" onClick={openCreate}>បង្កើត & បញ្ជូន</button>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-10">
        <div className="rounded-2xl border bg-white p-4 shadow-sm grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">ស្វែងរក</span>
            <input
              className="input"
              placeholder="អង្គភាព / ចំណងជើង"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-slate-600">កាលបរិច្ឆេទ</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div />
        </div>
      </div>

      {/* List / grid */}
      <div className="grid gap-3">
        {/* Loading skeletons */}
        {loading && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-16 flex-1 bg-slate-100 rounded" />
                  <div className="h-16 flex-1 bg-slate-100 rounded" />
                  <div className="h-16 flex-1 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-500 shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path d="M4 5h16v14H4z" stroke="#64748b" fill="none" strokeWidth="2" />
                <path d="M4 9h16" stroke="#64748b" strokeWidth="2" />
              </svg>
            </div>
            គ្មានទិន្នន័យ
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((it) => {
              const menuOpen = menuFor === it._id;
              return (
                <div key={it._id} className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition">
                  {/* header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">{dmy(it.date)}</div>
                      <div className="text-base font-medium mt-0.5 truncate" title={it.subject || "—"}>
                        {it.subject || "—"}
                      </div>
                      {it.summary ? (
                        <div className="text-sm text-slate-600 mt-1 line-clamp-2">{it.summary}</div>
                      ) : null}
                    </div>

                    <div className="relative shrink-0">
                      <Kebab open={menuOpen} onToggle={() => setMenuFor(menuOpen ? null : it._id)} />
                      {menuOpen && (
                        <div className="absolute right-0 mt-1 w-40 rounded-xl border bg-white shadow-lg z-10">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-t-xl"
                            onClick={() => { setMenuFor(null); openEdit(it); }}
                          >
                            កែ
                          </button>
                          <Link
                            to={`/timeline/${it._id}`}
                            className="block px-3 py-2 hover:bg-slate-50"
                            onClick={() => setMenuFor(null)}
                          >
                            ប្រវត្តិ
                          </Link>
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-red-600 rounded-b-xl"
                            onClick={() => { setMenuFor(null); onDelete(it._id); }}
                          >
                            លុប
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* steps */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip label="បានបញ្ចូនពី" value={it.fromDept} date={it.sentDate} color="indigo" />
                    <Chip label="បានទទួល​នៅ" value={it.receivedAt} date={it.receivedDate} color="sky" />
                    <Chip label="បានបញ្ចូនទៅ" value={it.toDept} date={it.forwardedDate} color="emerald" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl grid gap-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === "create" ? "បង្កើត & បញ្ជូនឯកសារ" : "កែសម្រួលឯកសារ"}
              </h3>
              <button
                type="button"
                className="btn-secondary px-2 py-1"
                onClick={() => { setOpen(false); resetForm(); }}
              >
                បិទ
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">កាលបរិច្ឆេទឯកសារ</span>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">ចំណងជើង</span>
                <input
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">មាតិកាសង្ខេប</span>
              <textarea
                rows={3}
                className="input"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានបញ្ចូនពី</span>
                <select
                  className="input"
                  value={form.fromDept}
                  onChange={(e) => setForm((f) => ({ ...f, fromDept: e.target.value }))}
                >
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input mt-2"
                  value={form.sentDate}
                  onChange={(e) => setForm((f) => ({ ...f, sentDate: e.target.value }))}
                  placeholder="កាលបរិច្ឆេទបញ្ចូន"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានទទួល​នៅ</span>
                <select
                  className="input"
                  value={form.receivedAt}
                  onChange={(e) => setForm((f) => ({ ...f, receivedAt: e.target.value }))}
                >
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input mt-2"
                  value={form.receivedDate}
                  onChange={(e) => setForm((f) => ({ ...f, receivedDate: e.target.value }))}
                  placeholder="កាលបរិច្ឆេទទទួល"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានបញ្ចូនទៅ</span>
                <select
                  className="input"
                  value={form.toDept}
                  onChange={(e) => setForm((f) => ({ ...f, toDept: e.target.value }))}
                >
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input mt-2"
                  value={form.forwardedDate}
                  onChange={(e) => setForm((f) => ({ ...f, forwardedDate: e.target.value }))}
                  placeholder="កាលបរិច្ឆេទបញ្ចូនបន្ត"
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">កំណត់ចំណាំ (សម្រាប់ផ្លូវចរាចរ)</span>
              <input
                className="input"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
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
                {files.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    បានជ្រើស {files.length} ឯកសារ
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn-secondary px-3 py-2"
                onClick={() => { setOpen(false); resetForm(); }}
              >
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
