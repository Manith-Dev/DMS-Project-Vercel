import fs from "fs";
import path from "path";
export function uniqueSafeName(dir, originalName){
  const safe = originalName.replace(/[^\w.\-()\sក-\u17D2\u17C6\u17C9\u17CB]/g,"_");
  const parsed = path.parse(safe);
  let candidate = safe; let i=1;
  while (fs.existsSync(path.join(dir,candidate))){
    candidate = `${parsed.name} (${i++})${parsed.ext}`;
  }
  return candidate;
}
