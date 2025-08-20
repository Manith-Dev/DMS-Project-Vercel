// client/src/components/TimelineCard.jsx
import React from "react";
import { updateHistoryStep, deleteHistoryStep } from "../lib/api.js";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";

const ADMIN = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const ALL_STAGES = [ADMIN, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN)];

function fmtDateTime(d) {
  const x = new Date(d);
  if (!d || isNaN(x)) return "—";
  return x.toLocaleString();
}

export default function TimelineCard({ docId, journey = [], onChanged }) {
  const [editing, setEditing] = React.useState(null); // idx
  const [form, setForm] = React.useState({ stage: "", note: "", at: "" });
  const [busyIdx, setBusyIdx] = React.useState(null);

  const items = [...(journey || [])].sort((a, b) => +new Date(a.at) - +new Date(b.at));

  function beginEdit(step) {
    setEditing(step.idx);
    setForm({
      stage: step.stage || step.actorDept || "",
      note: step.note || "",
      at: step.at ? new Date(step.at).toISOString().slice(0, 16) : "",
    });
  }

  async function saveEdit(idx) {
    setBusyIdx(idx);
    try {
      const payload = {
        stage: form.stage,
        note: form.note,
        at: form.at ? new Date(form.at).toISOString() : undefined,
      };
      await updateHistoryStep(docId, idx, payload);
      setEditing(null);
      onChanged && onChanged();
    } catch (e) {
      alert(e.message || "បរាជ័យក្នុងការកែប្រែ");
    } finally {
      setBusyIdx(null);
    }
  }

  async function remove(idx) {
    if (!confirm("លុបជំហានប្រវត្តិនេះ?")) return;
    setBusyIdx(idx);
    try {
      await deleteHistoryStep(docId, idx);
      onChanged && onChanged();
    } catch (e) {
      alert(e.message || "លុបបរាជ័យ");
    } finally {
      setBusyIdx(null);
    }
  }

  if (!items.length) return <div className="text-slate-500 text-sm">មិនទាន់មានប្រវត្តិ</div>;

  return (
    <ul className="grid gap-2">
      {items.map((h) => {
        const isEditing = editing === h.idx;
        const stageText = h.stage || h.actorDept || h.toDept || h.receivedAt || h.fromDept || "—";

        return (
          <li key={`${h.idx}-${h.at}`} className="rounded-lg border p-3">
            {!isEditing ? (
              <>
                <div className="text-xs text-slate-500">{fmtDateTime(h.at)}</div>
                <div className="text-sm font-medium mt-0.5">{stageText}</div>
                {h.note ? <div className="text-sm text-slate-700 mt-0.5">{h.note}</div> : null}
                <div className="text-xs text-slate-500 mt-0.5">
                  {(h.actorDept || "system")}{h.actorRole ? ` • ${h.actorRole}` : ""}
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="btn-secondary px-2 py-1" onClick={() => beginEdit(h)}>
                    កែប្រែ
                  </button>
                  <button
                    className="btn-danger px-2 py-1"
                    disabled={busyIdx === h.idx}
                    onClick={() => remove(h.idx)}
                  >
                    លុប
                  </button>
                </div>
              </>
            ) : (
              <div className="grid md:grid-cols-3 gap-2">
                <label className="grid gap-1">
                  <span className="text-xs text-slate-600">ជំហាន/ផ្នែក</span>
                  <select
                    className="input"
                    value={form.stage}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                  >
                    <option value="">— ជ្រើសរើស —</option>
                    {ALL_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-600">កាលបរិច្ឆេទ & ម៉ោង</span>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.at}
                    onChange={(e) => setForm((f) => ({ ...f, at: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-slate-600">កំណត់ចំណាំ</span>
                  <input
                    className="input"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </label>
                <div className="md:col-span-3 flex gap-2 justify-end">
                  <button className="btn-secondary px-3 py-1" onClick={() => setEditing(null)}>
                    បោះបង់
                  </button>
                  <button className="btn px-3 py-1" disabled={busyIdx === h.idx} onClick={() => saveEdit(h.idx)}>
                    រក្សាទុក
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
