// client/src/pages/Dispatch.jsx
import React from "react";
import { searchDocs, createDoc, setStage as apiSetStage } from "../lib/api.js";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";

const ADMIN = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const SPECIAL = [
  "អគ្គាធិការរង",
  "អគ្គាធិការ",
  "រដ្ឋលេខាធិការទទួលបន្ទុក",
  "អគ្គលេខាធិការដ្ឋាន",
  "រដ្ឋមន្រ្តី",
];
const ALL_DESTS = [ADMIN, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN), ...SPECIAL];

function formatDMY(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function SmallStep({ title, value, date }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-[12px] text-slate-500">{title}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
      <div className="text-[11px] text-slate-500">{formatDMY(date)}</div>
    </div>
  );
}

export default function Dispatch() {
  const [q, setQ] = React.useState("");
  const [date, setDate] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Compose modal
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const fileInput = React.useRef(null);

  // Form values (3 steps)
  const [form, setForm] = React.useState({
    date: "",
    subject: "",
    summary: "",
    priority: "Normal",

    fromDept: ADMIN,
    sentDate: "",

    receivedAt: "",
    receivedDate: "",

    toDept: "",
    forwardedDate: "",

    note: "",
  });

  async function load() {
    setLoading(true);
    try {
      const { items: list } = await searchDocs({
        q,
        date,
        page: 1,
        limit: 50,
        sourceType: "outgoing",
      });
      setItems(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [q, date]);

  function resetForm() {
    setForm({
      date: "",
      subject: "",
      summary: "",
      priority: "Normal",
      fromDept: ADMIN,
      sentDate: "",
      receivedAt: "",
      receivedDate: "",
      toDept: "",
      forwardedDate: "",
      note: "",
    });
    setFiles([]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onCreateAndSend(e) {
    e.preventDefault();

    const { date: docDate, subject, fromDept, toDept } = form;
    if (!docDate || !subject || !fromDept || !toDept) {
      alert("សូមបំពេញ កាលបរិច្ឆេទ / ចំណងជើង / បានបញ្ចូនពី / បានបញ្ចូនទៅ");
      return;
    }

    setSubmitting(true);
    try {
      // Defaults (if dates left blank)
      const sentDate = form.sentDate || form.date;
      const forwardedDate = form.forwardedDate || form.date;

      // 1) Create
      const payload = {
        date: form.date,
        organization: ADMIN,               // internal outgoing created by admin
        subject: form.subject,
        summary: form.summary,
        priority: form.priority,
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

      const created = await createDoc(payload, files);

      // 2) Move stage to destination immediately
      if (form.toDept) {
        await apiSetStage(created._id, { stage: form.toDept, note: form.note || "" });
      }

      setOpen(false);
      resetForm();
      await load();
    } catch (err) {
      alert(err.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">បញ្ជូនឯកសារ (ផ្ទៃក្នុង)</h1>
          <p className="text-slate-500 text-sm">បំពេញលំដាប់ ៣ ជំហាន៖ បានបញ្ចូនពី → បានទទួល​នៅ → បានបញ្ចូនទៅ</p>
        </div>
        <button className="btn px-3 py-2" onClick={() => setOpen(true)}>
          បង្កើត & បញ្ជូន
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 grid md:grid-cols-3 gap-3">
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

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-slate-600">
              <th className="px-4 py-2 text-left">កាលបរិច្ឆេទ</th>
              <th className="px-4 py-2 text-left">ចំណងជើង</th>
              <th className="px-4 py-2 text-left">បានបញ្ចូនពី</th>
              <th className="px-4 py-2 text-left">បានទទួលនៅ</th>
              <th className="px-4 py-2 text-left">បានបញ្ចូនទៅ</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  កំពុងផ្ទុក…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  គ្មានទិន្នន័យ
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it._id} className="border-t">
                <td className="px-4 py-2">{formatDMY(it.date)}</td>
                <td className="px-4 py-2 max-w-[48ch] truncate" title={it.subject}>
                  {it.subject}
                </td>
                <td className="px-4 py-2">
                  <SmallStep title="បានបញ្ចូនពី" value={it.fromDept} date={it.sentDate} />
                </td>
                <td className="px-4 py-2">
                  <SmallStep title="បានទទួល​នៅ" value={it.receivedAt} date={it.receivedDate} />
                </td>
                <td className="px-4 py-2">
                  <SmallStep title="បានបញ្ចូនទៅ" value={it.toDept} date={it.forwardedDate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compose modal */}
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <form onSubmit={onCreateAndSend} className="bg-white rounded-lg w-full max-w-3xl p-6 grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">បង្កើត & បញ្ជូនឯកសារ (ផ្ទៃក្នុង)</h3>
              <button
                type="button"
                className="btn-secondary px-2 py-1"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                បោះបង់
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

            {/* Three steps */}
            <div className="grid md:grid-cols-3 gap-4">
              <label className="grid gap-1">
                <span className="text-sm text-slate-600">បានបញ្ចូនពី</span>
                <select
                  className="input"
                  value={form.fromDept}
                  onChange={(e) => setForm((f) => ({ ...f, fromDept: e.target.value }))}
                >
                  {ALL_DESTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
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
                    <option key={d} value={d}>
                      {d}
                    </option>
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
                    <option key={d} value={d}>
                      {d}
                    </option>
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

            <label className="grid gap-1">
              <span className="text-sm text-slate-600">ភ្ជាប់ PDF (ជាជម្រើស)</span>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf"
                multiple
                className="input"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <div className="text-xs text-slate-600 mt-1">
                  បានជ្រើស {files.length} ឯកសារ
                </div>
              )}
            </label>

            <div className="flex items-center justify-end gap-3">
              <button type="submit" className="btn px-4 py-2" disabled={submitting}>
                {submitting ? "កំពុងបញ្ជូន…" : "បង្កើត & បញ្ជូន"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
