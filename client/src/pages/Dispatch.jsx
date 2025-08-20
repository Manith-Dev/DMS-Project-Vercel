// client/src/pages/Dispatch.jsx
import React from "react";
import { searchDocs, createDoc, setStage as apiSetStage } from "../lib/api.js";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ADMIN = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const SPECIAL = [
  "អគ្គាធិការរង",
  "អគ្គាធិការ",
  "រដ្ឋលេខាធិការទទួលបន្ទុក",
  "អគ្គលេខាធិការដ្ឋាន",
  "រដ្ឋមន្រ្តី",
];
const ALL_DESTS = [ADMIN, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN), ...SPECIAL];

/* ---- date helpers ---- */
function toISODate(d) {
  if (!d || isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fromISODate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
function formatDMY(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ---- small UI bits ---- */
function SmallStep({ title, value, date }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-[12px] text-slate-500">{title}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
      <div className="text-[11px] text-slate-500">{formatDMY(date)}</div>
    </div>
  );
}
function DateField({ valueISO, onChangeISO, placeholder = "ថ្ងៃ/ខែ/ឆ្នាំ", className = "input" }) {
  return (
    <DatePicker
      selected={fromISODate(valueISO)}
      onChange={(d) => onChangeISO(d ? toISODate(d) : "")}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
    />
  );
}

/* ---- PDF Dropzone component ---- */
function PdfDropzone({ files, setFiles, inputRef }) {
  const zoneRef = React.useRef(null);

  function addFiles(list) {
    const arr = Array.from(list || []);
    const pdfs = arr.filter((f) => f.type === "application/pdf");
    if (pdfs.length !== arr.length) {
      alert("សូមជ្រើសឯកសារ PDF ប៉ុណ្ណោះ");
    }
    // merge (avoid duplicates by name+size+lastModified)
    setFiles((prev) => {
      const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
      const seen = new Set(prev.map(key));
      const merged = [...prev];
      for (const f of pdfs) if (!seen.has(key(f))) merged.push(f);
      return merged;
    });
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    zoneRef.current?.classList.remove("ring-2", "ring-indigo-400");
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }
  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    zoneRef.current?.classList.add("ring-2", "ring-indigo-400");
  }
  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    zoneRef.current?.classList.remove("ring-2", "ring-indigo-400");
  }
  function onClick() {
    inputRef?.current?.click();
  }
  function onInputChange(e) {
    addFiles(e.target.files);
    // allow re-selecting same file(s)
    e.target.value = "";
  }
  function removeAt(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm text-slate-600">ភ្ជាប់ PDF (ជាជម្រើស)</span>

      <div
        ref={zoneRef}
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className="cursor-pointer border-2 border-dashed rounded-xl p-8 text-center text-slate-600 bg-slate-50/60 hover:bg-slate-50"
      >
        <div className="text-[15px]">បញ្ចូលឯកសារ PDF នៅទីនេះ៖</div>
        <div className="text-xs mt-1 text-slate-500">(ចុច ឬ ទាញដាក់)</div>
      </div>

      {/* hidden input that actually picks files */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={onInputChange}
      />

      {/* small file list (optional) */}
      {files?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
              className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm"
            >
              <span className="truncate max-w-[70%]" title={f.name}>{f.name}</span>
              <button
                type="button"
                className="btn-danger px-2 py-1"
                onClick={() => removeAt(i)}
              >
                លុប
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dispatch() {
  const [q, setQ] = React.useState("");
  const [date, setDate] = React.useState(""); // ISO YYYY-MM-DD
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Compose modal
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const fileInput = React.useRef(null);

  // Form values
  const [form, setForm] = React.useState({
    date: "",
    subject: "",
    summary: "",
    priority: "Normal",

    fromDept: "",
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
      fromDept: "",
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
      const sentDate = form.sentDate || form.date;
      const forwardedDate = form.forwardedDate || form.date;

      const payload = {
        date: form.date,
        organization: ADMIN,
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

      // Only call setStage if create didn't already place it at toDept
      if (!form.toDept) {
        await apiSetStage(created._id, {
          stage: form.toDept,
          note: form.note || "",
          at: forwardedDate || form.date,
        });
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
          <DateField valueISO={date} onChangeISO={setDate} />
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
                <DateField
                  valueISO={form.date}
                  onChangeISO={(v) => setForm((f) => ({ ...f, date: v }))}
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
                  <option value="">— ជ្រើសរើស —</option>
                  {ALL_DESTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <DateField
                  valueISO={form.sentDate}
                  onChangeISO={(v) => setForm((f) => ({ ...f, sentDate: v }))}
                  className="input mt-2"
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
                <DateField
                  valueISO={form.receivedDate}
                  onChangeISO={(v) => setForm((f) => ({ ...f, receivedDate: v }))}
                  className="input mt-2"
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
                <DateField
                  valueISO={form.forwardedDate}
                  onChangeISO={(v) => setForm((f) => ({ ...f, forwardedDate: v }))}
                  className="input mt-2"
                />
              </label>
            </div>

            <PdfDropzone files={files} setFiles={setFiles} inputRef={fileInput} />

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
