// client/src/pages/NewDocument.jsx
import React from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import Dropzone from "../components/Dropzone.jsx";
import { createDoc } from "../lib/api.js";
import { documentTypes, departments, prioritiesKh } from "../data/options.js";

const schema = z.object({
  date: z.string().min(1, "ត្រូវការ"),
  organization: z.string().min(1, "ត្រូវការ"),
  subject: z.string().min(1, "ត្រូវការ"),
  summary: z.string().optional(),
  remarks: z.string().optional(),
  department: z.string().optional(),
  priority: z.string().optional(), // still stores Low/Normal/High
  confidential: z.boolean().optional(),
  documentType: z.string().min(1, "ត្រូវការ"),
});

export default function NewDocument() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({ resolver: zodResolver(schema) });

  const [files, setFiles] = React.useState([]);
  const [status, setStatus] = React.useState("");

  const onSubmit = async (values) => {
    setStatus("កំពុងរក្សាទុក…");
    try {
      await createDoc(values, files);
      setStatus("បានរក្សាទុក!");
      reset();
      setFiles([]);
    } catch (e) {
      setStatus(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 grid gap-4">
      <h2 className="text-xl font-semibold">បញ្ចូលឯកសារ</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="កាលបរិច្ឆេទ">
          {/* Date as ថ្ងៃ/ខែ/ឆ្នាំ but stored as YYYY-MM-DD */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                selected={field.value ? new Date(field.value) : null}
                onChange={(d) => field.onChange(d ? d.toISOString().slice(0, 10) : "")}
                dateFormat="dd/MM/yyyy"
                placeholderText="ថ្ងៃ/ខែ/ឆ្នាំ"
                className="input"
              />
            )}
          />
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
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Error msg={errors.documentType?.message} />
        </Field>

        <Field label="នាយកដ្ឋាន/Department">
          <select className="input" {...register("department")}>
            <option value="">-- ជ្រើសរើស --</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        {/* Khmer labels shown, but values saved as Low/Normal/High */}
        <Field label="កម្រិតបញ្ចាក់/Priority">
          <select className="input" {...register("priority")}>
            {prioritiesKh.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ចំណងជើង/Subject" className="md:col-span-3">
          <input className="input" {...register("subject")} />
          <Error msg={errors.subject?.message} />
        </Field>
      </div>

      <Field label="សេចក្ដីសង្ខេប/Summary">
        <textarea rows="3" className="input" {...register("summary")}></textarea>
      </Field>

      <Field label="កំណត់ចំណាំ/Remarks">
        <textarea rows="3" className="input" {...register("remarks")}></textarea>
      </Field>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="conf" {...register("confidential")} />
        <label htmlFor="conf">សម្ងាត់/Confidential</label>
      </div>

      <div className="grid gap-1">
        <label className="text-sm">ឯកសារ PDF</label>
        <Dropzone files={files} setFiles={setFiles} />
      </div>

      <div className="flex items-center gap-3">
        <button className="btn">រក្សាទុក</button>
        <span className="text-sm text-slate-600">{status}</span>
      </div>
    </form>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Error({ msg }) {
  return msg ? <span className="text-red-600 text-sm">{msg}</span> : null;
}
