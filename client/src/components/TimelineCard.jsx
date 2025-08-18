import React from "react";

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function TimelineCard({ journey }) {
  if (!journey?.length) return null;
  return (
    <div className="bg-slate-50 rounded-xl p-4 grid gap-2">
      {journey.map((ev, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500" />
          <div className="flex-1">
            <div className="text-sm text-slate-600">
              {ev.type === "created" && <b>បានបង្កើតឯកសារ</b>}
              {ev.type === "stageChanged" && <b>ផ្លាស់ទីតួនាទីទៅ: {ev.stage}</b>}
              {ev.type === "completed" && <b>បានបញ្ចប់</b>}
            </div>
            {ev.note && <div className="text-slate-800">{ev.note}</div>}
            <div className="text-xs text-slate-500">
              {fmt(ev.at)} • {ev.actor || "system"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
