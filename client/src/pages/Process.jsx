// client/src/pages/Process.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  searchDocs,
  setStage as apiSetStage,
  getJourney,
} from "../lib/api.js";
import TimelineCard from "../components/TimelineCard.jsx";
import { departments as BASE_DEPARTMENTS } from "../data/options.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/* ------------------ constants ------------------ */
const ADMIN_NAME = "នាយកដ្ឋានរដ្ឋបាលសរុប";
const STEPS = [ADMIN_NAME, ...BASE_DEPARTMENTS.filter((d) => d !== ADMIN_NAME)];
const PAGE_SIZE = 10;

/* ------------------ utils ------------------ */
function formatDateDMY(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d)) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function cls(...a) { return a.filter(Boolean).join(" "); }
function resolveRowDept(it) {
  return it.department || it.toDept || it.receivedAt || it.fromDept || "";
}

/* ------------------ small UI bits ------------------ */
function StageBadge({ stage }) {
  if (!stage) {
    return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">—</span>;
  }
  const isAdmin = stage === ADMIN_NAME;
  const colors = isAdmin ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700";
  return <span className={cls("px-2 py-0.5 rounded text-xs whitespace-nowrap", colors)}>{stage}</span>;
}

/* ------------------ next-stage options (Department ⇄ Admin) ------------------ */
function getNextStageOptions({ role, userDept, currentStage, rowDept }) {
  if (role === "department") {
    if (!userDept) return [];
    if (currentStage === userDept)   return [ADMIN_NAME];
    if (currentStage === ADMIN_NAME) return [userDept];
    return [];
  }
  if (role === "admin") {
    if (!rowDept) return [];
    if (currentStage === ADMIN_NAME) return [rowDept];
    if (currentStage === rowDept)    return [ADMIN_NAME];
    return [];
  }
  return [];
}

/* ------------------ page ------------------ */
export default function Process() {
  const nav = useNavigate();

  // filters
  const [q, setQ] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [date, setDate] = React.useState("");

  // data
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // pagination
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const view = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  // role & dept
  const role     = (typeof window !== "undefined" && localStorage.getItem("role")) || "";
  const userDept = (typeof window !== "undefined" && localStorage.getItem("department")) || "";
  const canQuickMove = ["admin", "department"].includes(role);

  // Inline Timeline
  const [openRow, setOpenRow] = React.useState(null); // id of expanded row
  const [timeline, setTimeline] = React.useState({}); // cache: id -> journey[]

  async function toggleTimeline(id) {
    if (openRow === id) { setOpenRow(null); return; }
    setOpenRow(id);
    if (!timeline[id]) {
      try {
        // ✅ Normalize all possible shapes to a plain array
        const raw = await getJourney(id);
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.history)
          ? raw.history
          : [];
        setTimeline(prev => ({ ...prev, [id]: arr }));
      } catch (e) {
        alert(e.message || "មិនអាចទាញយកប្រវត្តិបានទេ");
      }
    }
  }

  async function load(current = {}) {
    setLoading(true);
    try {
      const { items: list } = await searchDocs({
        q: current.q ?? q,
        type: "",
        date: current.date ?? date, // api.js maps date -> dateFrom/dateTo too
        page: 1,
        limit: 50,
        stage: current.stage ?? stage,
        department: current.department ?? department,
      });
      setItems(Array.isArray(list) ? list : []);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => {
    const h = setTimeout(() => load({ q, stage, department, date }), 400);
    return () => clearTimeout(h);
  }, [q, stage, department, date]);

  function clearFilters() { setQ(""); setStage(""); setDepartment(""); setDate(""); }

  // Quick stage change per row (dropdown)
  const [openFor, setOpenFor] = React.useState(null);
  async function setStageNow(docId, newStage) {
    try {
      await apiSetStage(docId, { stage: newStage, note: "" });
      setOpenFor(null);
      // optimistic table update
      setItems((prev) => prev.map((d) => (d._id === docId ? { ...d, stage: newStage } : d)));
      // optimistic timeline update so it appears immediately
      setTimeline((prev) => {
        const old = prev[docId] || [];
        const step = { stage: newStage, at: new Date().toISOString(), note: "", actorDept: newStage, actorRole: "system" };
        return { ...prev, [docId]: old.concat([step]) };
      });
    } catch (e) {
      alert(e.message || "បរាជ័យក្នុងការកំណត់ដំណាក់កាល");
    }
  }

  return (
    <div className="grid gap-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ដំណើរការឯកសារ</h1>
          <p className="text-slate-500 text-sm">
            មើលទីតាំងបច្ចុប្បន្ន និងប្ដូរដំណាក់កាលរវាង នាយកដ្ឋាន ⇄ {ADMIN_NAME}
          </p>
        </div>
        <button className="btn-secondary px-3 py-2" onClick={clearFilters}>សម្អាតតម្រង</button>
      </div>

      {/* Filters */}
      <div className="card p-4 grid md:grid-cols-4 gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">ស្វែងរក</span>
          <input
            className="input"
            placeholder="អង្គភាព / ចំណងជើង / សង្ខេប"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">ស្ថានភាពបច្ចុប្បន្ន</span>
          <select className="input" value={stage} onChange={(e)=>setStage(e.target.value)}>
            <option value="">ទាំងអស់</option>
            {STEPS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">នាយកដ្ឋាន</span>
          <select className="input" value={department} onChange={(e)=>setDepartment(e.target.value)}>
            <option value="">ទាំងអស់</option>
            {BASE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-600">កាលបរិច្ឆេទ</span>
          <DatePicker
            selected={date ? new Date(date) : null}
            onChange={(d) => setDate(d ? d.toISOString().slice(0,10) : "")}
            dateFormat="dd/MM/yyyy"
            placeholderText="ថ្ងៃ/ខែ/ឆ្នាំ"
            className="input"
          />
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-slate-600">
              <th className="px-4 py-2 text-left">កាលបរិច្ឆេទ</th>
              <th className="px-4 py-2 text-left">អង្គភាព</th>
              <th className="px-4 py-2 text-left">ចំណងជើង</th>
              <th className="px-4 py-2 text-left">ស្ថានភាព</th>
              <th className="px-4 py-2 text-left">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">កំពុងផ្ទុក…</td></tr>
            )}

            {!loading && view.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <div className="inline-flex items-center gap-3 text-slate-500">
                    <span className="text-2xl">📄</span><span>គ្មានទិន្នន័យ</span>
                  </div>
                </td>
              </tr>
            )}

            {view.map((it) => {
              const rowDept = resolveRowDept(it);
              return (
                <React.Fragment key={it._id}>
                  <tr className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2">{formatDateDMY(it.date)}</td>
                    <td className="px-4 py-2">{it.organization || "-"}</td>
                    <td className="px-4 py-2 max-w-[52ch] truncate" title={it.subject}>{it.subject || "-"}</td>
                    <td className="px-4 py-2"><StageBadge stage={it.stage} /></td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button className="btn-secondary px-2 py-1" onClick={() => toggleTimeline(it._id)}>
                          {openRow === it._id ? "បិទប្រវត្តិ" : "មើលប្រវត្តិ"}
                        </button>
                        <button className="btn-secondary px-2 py-1" onClick={() => nav(`/timeline/${it._id}`)}>
                          ទំព័រលម្អិត
                        </button>

                        {canQuickMove && (
                          <div className="relative">
                            <button className="btn px-2 py-1" onClick={() => setOpenFor((v) => (v === it._id ? null : it._id))}>
                              ប្ដូរដំណាក់កាល
                            </button>
                            {openFor === it._id && (
                              <div className="absolute z-10 mt-2 w-56 bg-white border rounded-lg shadow p-1">
                                {(() => {
                                  const options = getNextStageOptions({ role, userDept, currentStage: it.stage, rowDept });
                                  if (options.length === 0) return <div className="px-3 py-2 text-slate-500 text-sm">មិនមានសកម្មភាព</div>;
                                  return options.map((s) => (
                                    <button key={s} className="w-full text-left px-3 py-2 rounded hover:bg-slate-50" onClick={() => setStageNow(it._id, s)}>
                                      {s}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {openRow === it._id && (
                    <tr className="bg-white">
                      <td colSpan={5} className="px-4 py-4">
                        <TimelineCard journey={timeline[it._id] || []} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {!loading && items.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-slate-600">ទំព័រ {page} / {totalPages}</div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary px-2 py-1" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>មុន</button>
              <button className="btn-secondary px-2 py-1" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>បន្ទាប់</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
