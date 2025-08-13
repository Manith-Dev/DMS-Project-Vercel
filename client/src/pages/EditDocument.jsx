// client/src/pages/EditDocument.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Dropzone from "../components/Dropzone.jsx";
import { getDoc, updateDoc } from "../lib/api.js";
import { documentTypes, departments, prioritiesKh } from "../data/options.js";

const schema = z.object({
  date: z.string().min(1, "ត្រូវការ"),
  organization: z.string().min(1, "ត្រូវការ"),
  subject: z.string().min(1, "ត្រូវការ"),
  summary: z.string().optional(),
  remarks: z.string().optional(),
  department: z.string().optional(),
  priority: z.string().optional(), // Low/Normal/High
  confidential: z.boolean().optional(),
  documentType: z.string().min(1, "ត្រូវការ"),
});

export default function EditDocument() {
  const { id } = useParams();
  const nav = useNavigate();

  const { register, handleSubmit, formState:{errors}, reset } = useForm({
    resolver: zodResolver(schema),
  });

  const [loading, setLoading] = React.useState(true);
  const [files, setFiles] = React.useState([]); // new files to add
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const d = await getDoc(id); // throws if not found
        // Convert date to yyyy-mm-dd for input
        const dateStr = d.date ? new Date(d.date).toISOString().slice(0,10) : "";
        reset({
          date: dateStr,
          organization: d.organization || "",
          subject: d.subject || "",
          summary: d.summary || "",
          remarks: d.remarks || "",
          department: d.department || "",
          priority: d.priority || "Normal",
          confidential: !!d.confidential,
          documentType: d.documentType || "",
        });
      } catch (e) {
        setStatus("មិនអាចទាញទិន្នន័យ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, reset]);

  const onSubmit = async (values) => {
    setStatus("កំពុងកែប្រែ…");
    try {
      await updateDoc(id, values, files);
      setStatus("បានកែប្រែ!");
      setFiles([]);
      // optional: go back to dashboard
      // nav("/");
    } catch (e) {
      setStatus(e.message || "បរាជ័យក្នុងការកែប្រែ");
    }
  };

  if (loading) return <div className="card p-4">កំពុងផ្ទុក…</div>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 grid gap-4">
      <h2 className="text-xl font-semibold">កែប្រែឯកសារ</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="កាលបរិច្ឆេទ">
          <input type="date" className="input" {...register("date")} />
          <Error msg={errors.date?.message} />
        </Field>
        <Field label="អង្គភាព/Organization">
          <input className="input" {...register("organization")} />
          <Error msg={errors.organization?.message} />
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ប្រភេទឯកសារ">
          <select className="input" {...register("documentType")}>
            <option value="">-- ជ្រើសរើស --</option>
            {documentTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Error msg={errors.documentType?.message} />
        </Field>

        <Field label="នាយកដ្ឋាន/Department">
          <select className="input" {...register("department")}>
            <option value="">-- ជ្រើសរើស --</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>

        <Field label="កម្រិត/Priority">
          <select className="input" {...register("priority")}>
            {prioritiesKh.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="ចំណងជើង/Subject">
        <input className="input" {...register("subject")} />
        <Error msg={errors.subject?.message} />
      </Field>

      <Field label="សេចក្ដីសង្ខេប/Summary">
        <textarea rows="3" className="input" {...register("summary")} />
      </Field>

      <Field label="កំណត់ចំណាំ/Remarks">
        <textarea rows="3" className="input" {...register("remarks")} />
      </Field>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="conf" {...register("confidential")} />
        <label htmlFor="conf">សម្ងាត់/Confidential</label>
      </div>

      <div className="grid gap-1">
        <label className="text-sm">បន្ថែមឯកសារ PDF (ជ្រើសរើស)</label>
        <Dropzone files={files} setFiles={setFiles} />
        <div className="text-xs text-slate-500">
          * ឯកសារចាស់នៅតែរក្សាទុក; ឯកសារថ្មីនឹងត្រូវបន្ថែម។
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn">រក្សាទុក</button>
        <span className="text-sm text-slate-600">{status}</span>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Error({ msg }) {
  return msg ? <span className="text-red-600 text-sm">{msg}</span> : null;
}
