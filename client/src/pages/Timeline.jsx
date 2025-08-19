// client/src/pages/Timeline.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";
import { getDoc, getJourney, setStage as apiSetStage } from "../lib/api.js";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";

const ADMIN = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const SPECIAL = [
  "អគ្គាធិការរង",
  "អគ្គាធិការ",
  "រដ្ឋលេខាធិការទទួលបន្ទុក",
  "អគ្គលេខាធិការដ្ឋាន",
  "រដ្ឋមន្រ្តី",
];
const ALL_STAGES = [ADMIN, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN), ...SPECIAL];

function fmtDateTime(s) {
  const d = new Date(s);
  if (isNaN(d)) return "—";
  return d.toLocaleString();
}

// Normalize any journey response shape to a plain array
function normalizeJourney(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.history)) return raw.history;
  return [];
}

export default function Timeline() {
  const { id } = useParams();
  const [doc, setDoc] = React.useState(null);
  const [journey, setJourney] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // form state
  const [stage, setStageValue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [at, setAt] = React.useState(""); // datetime-local value

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [d, j] = await Promise.all([getDoc(id), getJourney(id)]);
      setDoc(d);
      const arr = normalizeJourney(j).sort(
        (a, b) => +new Date(a.at) - +new Date(b.at)
      );
      setJourney(arr);
    } catch (e) {
      setErr(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onAddStep(e) {
    e.preventDefault();
    if (!stage) {
      alert("សូមជ្រើសកម្រិត/ផ្នែក (stage)");
      return;
    }
    try {
      const payload = { stage, note: note || "" };
      if (at) {
        const asDate = new Date(at);
        if (!isNaN(asDate)) payload.at = asDate.toISOString();
      }
      await apiSetStage(id, payload);

      // reset form
      setStageValue("");
      setNote("");
      setAt("");

      // reload doc + journey to reflect the new step
      await load();
    } catch (e) {
      alert(e.message || "បន្ថែមប្រវត្តិបរាជ័យ");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ប្រវត្តិនៅកាលលើ</h1>
        <Link to="/" className="text-indigo-600 hover:underline">ត្រឡប់ក្រោយ</Link>
      </div>

      {loading && <div className="card p-4 text-slate-600">កំពុងផ្ទុក…</div>}
      {!!err && <div className="card p-4 text-red-600">{err}</div>}

      {doc && (
        <div className="card p-4">
          <div className="text-sm text-slate-500">ឯកសារ</div>
          <div className="text-lg font-medium">{doc.subject || "—"}</div>
          <div className="text-sm text-slate-600">{doc.organization || "—"}</div>
          <div className="text-sm text-slate-600 mt-1">
            ស្ថានភាពបច្ចុប្បន្ន: <span className="font-medium">{doc.stage || "—"}</span>
          </div>
        </div>
      )}

      {/* Add step form */}
      <form onSubmit={onAddStep} className="card p-4 grid md:grid-cols-3 gap-4">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">ជំហាន/ផ្នែក (stage)</span>
          <select
            className="input"
            value={stage}
            onChange={(e) => setStageValue(e.target.value)}
          >
            <option value="">— ជ្រើសរើស —</option>
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">កាលបរិច្ឆេទ & ម៉ោង</span>
          <input
            type="datetime-local"
            className="input"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </label>

        <label className="grid gap-1 md:col-span-1">
          <span className="text-sm text-slate-600">កំណត់ចំណាំ</span>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="សេចក្ដីលម្អិត (ជាជម្រើស)"
          />
        </label>

        <div className="md:col-span-3 flex justify-end">
          <button className="btn px-4 py-2" type="submit">បន្ថែមទៅប្រវត្តិ</button>
        </div>
      </form>

      {/* History list */}
      <div className="card p-4">
        <h2 className="text-base font-semibold mb-3">ប្រវត្តិចរាចរ</h2>
        {journey.length === 0 ? (
          <div className="text-slate-500 text-sm">មិនទាន់មានប្រវត្តិ</div>
        ) : (
          <ul className="grid gap-3">
            {journey.map((h, i) => (
              <li key={i} className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">{fmtDateTime(h.at)}</div>
                <div className="text-sm font-medium mt-0.5">{h.stage || "—"}</div>
                {h.note ? (
                  <div className="text-sm text-slate-700 mt-0.5">{h.note}</div>
                ) : null}
                <div className="text-xs text-slate-500 mt-0.5">
                  {h.actorDept || "system"}{h.actorRole ? ` • ${h.actorRole}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
