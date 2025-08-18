// server/workflow/config.js

// Roles in your org
export const ROLES = {
  ADMIN: "admin",         // នាយកដ្ឋានរដ្ឋបាលសរុប (main controller)
  DEPT: "department",     // the 5 sub-departments (each user has a department)
  DEPUTY: "deputy",       // អគ្គាធិការរង
  DIRECTOR: "director",   // អគ្គនាយក (big boss)
};

// Khmer labels you already use
export const ADMIN_DEPT_NAME = "នាយកដ្ឋានរដ្ឋបាលសរុប";

// Turn a department label into a stage string
export const stageForDept = (deptName) => `នាយកដ្ឋាន: ${deptName}`;

// Identify if a stage is a department stage and extract the dept
export function parseDeptStage(stage) {
  const m = String(stage || "").match(/^នាយកដ្ឋាន:\s*(.+)$/);
  return m ? m[1] : null; // returns department name or null
}

// Canonical stages in the journey
export const STAGES = [
  "អាដ្មិន: ទទួល/រៀបចំ",                 // Admin: Intake
  // department stages are dynamic: stageForDept("<name>")
  "អគ្គាធិការរង: ពិនិត្យ",                // Deputy check
  "អគ្គនាយក: អនុម័ត",                      // Director approval
  "បានបិទ"                                  // Closed
];

// A transition is allowed if (from, to, action) matches and the user's role (and sometimes dept) is allowed.
// We’ll use the special token ":ANY_DEPT" for rules that target any department stage.
export const TRANSITIONS = [
  // Admin routes work to a department (send down)
  { from: "អាដ្មិន: ទទួល/រៀបចំ", to: ":ANY_DEPT", action: "FORWARD", roles: [ROLES.ADMIN] },

  // Department sends up to Admin
  { from: ":ANY_DEPT", to: "អាដ្មិន: ទទួល/រៀបចំ", action: "FORWARD", roles: [ROLES.DEPT], ownDeptOnly: true },

  // Admin escalates to Deputy
  { from: "អាដ្មិន: ទទួល/រៀបចំ", to: "អគ្គាធិការរង: ពិនិត្យ", action: "FORWARD", roles: [ROLES.ADMIN] },

  // Deputy → Director (OK)
  { from: "អគ្គាធិការរង: ពិនិត្យ", to: "អគ្គនាយក: អនុម័ត", action: "FORWARD", roles: [ROLES.DEPUTY] },

  // Deputy → Admin (NOT OK, return for fix)
  { from: "អគ្គាធិការរង: ពិនិត្យ", to: "អាដ្មិន: ទទួល/រៀបចំ", action: "RETURN", roles: [ROLES.DEPUTY] },

  // After Admin receives returned doc, Admin sends to the responsible Dept again
  { from: "អាដ្មិន: ទទួល/រៀបចំ", to: ":ANY_DEPT", action: "RETURN", roles: [ROLES.ADMIN] },

  // Director → Closed (approve)
  { from: "អគ្គនាយក: អនុម័ត", to: "បានបិទ", action: "APPROVE", roles: [ROLES.DIRECTOR] },

  // Director → Admin (send back down)
  { from: "អគ្គនាយក: អនុម័ត", to: "អាដ្មិន: ទទួល/រៀបចំ", action: "RETURN", roles: [ROLES.DIRECTOR] },
];

// Check permission for a transition; toStage may be a dept stage (dynamic)
export function canTransition({ fromStage, toStage, action, user }) {
  const isDeptFrom = !!parseDeptStage(fromStage);
  const isDeptTo   = !!parseDeptStage(toStage);

  const candidates = TRANSITIONS.filter(t => {
    const fromMatch = (t.from === fromStage) || (t.from === ":ANY_DEPT" && isDeptFrom);
    const toMatch   = (t.to   === toStage)   || (t.to   === ":ANY_DEPT" && isDeptTo);
    return fromMatch && toMatch && t.action === action;
  });

  if (candidates.length === 0) return false;

  // role check + ownDeptOnly enforcement
  for (const t of candidates) {
    if (!t.roles.includes(user.role)) continue;

    if (t.ownDeptOnly) {
      // Only allow if user.department matches the dept embedded in fromStage (the doc is in their dept)
      const fromDept = parseDeptStage(fromStage);
      if (!fromDept || fromDept !== user.department) continue;
    }
    return true;
  }
  return false;
}
