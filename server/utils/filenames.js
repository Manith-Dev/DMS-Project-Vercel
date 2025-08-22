// server/utils/filenames.js
import fs from "fs";
import path from "path";

/** Convert latin1 → utf8 (best effort). No-op if already utf8. */
export function latin1ToUtf8(str = "") {
  try {
    return Buffer.from(str, "latin1").toString("utf8");
  } catch {
    return str;
  }
}

/** Keep Khmer block U+1780–U+17FF + \w . - ( ) space. Replace others with "_" */
export function sanitizeKhmerFilename(name = "") {
  const normalized = String(name).normalize("NFC");
  return normalized.replace(/[^\w.\-()\s\u1780-\u17FF]/g, "_");
}

/** Make a unique, safe filename inside dir while preserving Khmer */
export function uniqueSafeName(dir, originalName) {
  const source = sanitizeKhmerFilename(latin1ToUtf8(originalName || "file.pdf"));
  const parsed = path.parse(source);

  const base = parsed.name || "file";
  const ext = parsed.ext || ".pdf";

  let candidate = `${base}${ext}`;
  let i = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base} (${i++})${ext}`;
  }
  return candidate;
}

/** RFC5987/6266 UTF-8 filename with ASCII fallback */
export function contentDispositionUtf8(filename = "file.pdf") {
  const fallback = String(filename)
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/"/g, "'");
  const encoded = encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
