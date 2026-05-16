function normalizeNewlines(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n");
}

function stripBom(text) {
  const s = String(text ?? "");
  return s.startsWith("\uFEFF") ? s.slice(1) : s;
}

function stripAnsi(text) {
  const s = String(text ?? "");
  // Covers common CSI sequences like \x1b[90m, plus a few other ANSI forms.
  return s
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b[\(\)][A-Za-z0-9]/g, "");
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function toNullOrString(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function normalizeTimelineEntry(input, warnings, context) {
  const obj = isPlainObject(input) ? input : {};
  const ts = toNullOrString(obj.ts);
  const kind = toNullOrString(obj.kind);
  const role = toNullOrString(obj.role);
  const taskId = toNullOrString(obj.task_id);
  const status = toNullOrString(obj.status);
  const label = toNullOrString(obj.label);
  const msg =
    toNullOrString(obj.msg) ??
    toNullOrString(obj.reason) ??
    toNullOrString(obj.question) ??
    toNullOrString(obj.answer);

  const data = isPlainObject(obj.data) ? { ...obj.data } : {};
  if (isPlainObject(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      if (
        k === "ts" ||
        k === "kind" ||
        k === "role" ||
        k === "task_id" ||
        k === "status" ||
        k === "label" ||
        k === "msg" ||
        k === "data"
      ) {
        continue;
      }
      data[k] = v;
    }
  }

  if (!kind) warnings.push(`event missing kind${context ? ` (${context})` : ""}`);
  return { ts, kind, role, task_id: taskId, status, label, msg, data };
}

function tryParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function parseKeyValuePairs(text) {
  const s = String(text ?? "").trim();
  if (!s) return null;

  const out = {};
  const re =
    /([A-Za-z_][A-Za-z0-9_\-\.]*?)=("((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|(\S+))/g;
  let m;
  let matched = 0;
  while ((m = re.exec(s))) {
    matched++;
    const key = m[1];
    const raw = m[3] ?? m[4] ?? m[5] ?? "";
    out[key] = raw.replace(/\\(["'\\])/g, "$1");
  }
  if (matched === 0) return null;
  return out;
}

function parsePipeDelimitedKeyValuePairs(text) {
  const s = String(text ?? "");
  if (!s.includes("|")) return null;

  const parts = s
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const out = {};
  let matched = 0;
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    matched++;
    const key = part.slice(0, eq).trim();
    let value = part.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1).replace(/\\(["'\\])/g, "$1");
    }
    out[key] = value;
  }
  if (matched === 0) return null;
  return out;
}

function parseCanonicalRecord(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;

  // 1) JSON object
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const res = tryParseJson(trimmed);
    if (res.ok && isPlainObject(res.value)) return res.value;
  }

  // 2) pipe-delimited key=value
  const piped = parsePipeDelimitedKeyValuePairs(trimmed);
  if (piped) return piped;

  // 3) whitespace-delimited key=value
  const kv = parseKeyValuePairs(trimmed);
  if (kv) return kv;

  return null;
}

function parseEventsFromJsonish(text, warnings) {
  const trimmed = stripBom(text).trim();
  if (!trimmed) return null;

  // JSON array
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const res = tryParseJson(trimmed);
    if (!res.ok) {
      warnings.push("failed to parse JSON array input");
      return null;
    }
    const arr = Array.isArray(res.value) ? res.value : [];
    const timeline = arr.map((e, i) => normalizeTimelineEntry(e, warnings, `json[${i}]`));
    return { timeline, warnings };
  }

  // JSONL
  const lines = trimmed.split("\n");
  let parsedCount = 0;
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const line = stripBom(lines[i]).trim();
    if (!line) continue;
    if (!(line.startsWith("{") && line.endsWith("}"))) continue;
    const res = tryParseJson(line);
    if (!res.ok) {
      warnings.push(`failed to parse JSON at line ${i + 1}`);
      continue;
    }
    parsedCount++;
    parsed.push(res.value);
  }
  if (parsedCount === 0) return null;

  const timeline = parsed.map((e, i) => normalizeTimelineEntry(e, warnings, `jsonl[${i}]`));
  return { timeline, warnings };
}

function parsePrettyTimestampPrefix(line) {
  const m = /^\[(\d{2}:\d{2}:\d{2})\]\s+(.*)$/.exec(line);
  if (!m) return null;
  return { ts: m[1], rest: m[2] };
}

function normalizePrettyEventLine(line, warnings, lineNo) {
  const clean = stripAnsi(line).trimEnd();
  const pref = parsePrettyTimestampPrefix(clean);
  if (!pref) {
    // Not a pretty_print line; treat as raw text blob entry.
    return normalizeTimelineEntry(
      { ts: null, kind: "text_line", msg: clean, data: { line_no: lineNo } },
      warnings,
      `line ${lineNo}`
    );
  }

  const { ts, rest } = pref;
  const r = rest.trim();

  const canonical = parseCanonicalRecord(r);
  if (canonical) {
    const record = { ...canonical };
    if (record.ts === undefined || record.ts === null) record.ts = ts;
    return normalizeTimelineEntry(record, warnings, `line ${lineNo}`);
  }

  // PHASE header lines: "PHASE 1/3  Title"
  let m = /^PHASE\s+(\S+)\s+(.*)$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "phase_start", msg: m[2] || null, data: { phase: m[1] } },
      warnings,
      `line ${lineNo}`
    );
  }

  // role start: "CEO ▸ start  label"
  m = /^([A-Z_]+)\s+▸\s+start\s+(.*)$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "role_start", role: m[1].toLowerCase(), label: m[2] || null, msg: m[2] || null },
      warnings,
      `line ${lineNo}`
    );
  }

  // role done: "CEO ◂ GREEN  label"
  m = /^([A-Z_]+)\s+◂\s+([A-Z_]+)\s+(.*)$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "role_done", role: m[1].toLowerCase(), status: m[2], label: m[3] || null, msg: m[3] || null },
      warnings,
      `line ${lineNo}`
    );
  }

  // worktree create: "wt <path> [branch]"
  m = /^wt\s+(.*?)\s+\[([^\]]+)\]\s*$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "worktree_create", data: { path: m[1], branch: m[2] } },
      warnings,
      `line ${lineNo}`
    );
  }

  // task lines: "task <id> → worktree=<id>" or "task <id> GREEN diff=.. reason=.."
  m = /^task\s+(\S+)\s+(.*)$/.exec(r);
  if (m) {
    const taskId = m[1];
    const tail = m[2] || "";
    if (tail.includes("→") || tail.includes("worktree=")) {
      return normalizeTimelineEntry(
        { ts, kind: "task_start", task_id: taskId, data: { text: tail } },
        warnings,
        `line ${lineNo}`
      );
    }
    const statusMatch = /\b(GREEN|BLOCKED|ERROR|PARSE_ERROR|TIMEOUT|FAIL_MAX_REVISIONS|FAIL)\b/.exec(tail);
    return normalizeTimelineEntry(
      { ts, kind: "task_done", task_id: taskId, status: statusMatch ? statusMatch[1] : null, data: { text: tail } },
      warnings,
      `line ${lineNo}`
    );
  }

  // merge: "merge <branch> → <into> conflicts=N"
  m = /^merge\s+(\S+)\s+→\s+(\S+)\s+conflicts=(\d+)\s*$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "merge", data: { branch: m[1], into: m[2], conflicts: Number(m[3]) } },
      warnings,
      `line ${lineNo}`
    );
  }

  // awaiting user / reply
  m = /^CEO asks\s+(.*)$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "awaiting_user", msg: m[1] || null, data: { question: m[1] || "" } },
      warnings,
      `line ${lineNo}`
    );
  }
  m = /^you\s+(.*)$/.exec(r);
  if (m) {
    return normalizeTimelineEntry(
      { ts, kind: "user_reply", msg: m[1] || null, data: { answer: m[1] || "" } },
      warnings,
      `line ${lineNo}`
    );
  }

  // Fallback: keep the rest of the line for display/debugging.
  return normalizeTimelineEntry(
    { ts, kind: "text_line", msg: r, data: { line_no: lineNo } },
    warnings,
    `line ${lineNo}`
  );
}

export function parseEvents(text) {
  const warnings = [];
  const raw = stripBom(normalizeNewlines(text));
  const cleaned = stripAnsi(raw);

  if (!cleaned.trim()) {
    warnings.push("empty events text");
    return { timeline: [], warnings };
  }

  const fromJson = parseEventsFromJsonish(cleaned, warnings);
  if (fromJson) {
    // Ensure `warnings` array identity is stable for callers.
    return { timeline: fromJson.timeline, warnings: [...warnings] };
  }

  const lines = cleaned.split("\n");
  const timeline = [];
  for (let i = 0; i < lines.length; i++) {
    const line = stripBom(lines[i]);
    if (!line.trim()) continue;

    const trimmed = line.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const res = tryParseJson(trimmed);
      if (res.ok) {
        timeline.push(normalizeTimelineEntry(res.value, warnings, `json_line ${i + 1}`));
        continue;
      }
    }
    timeline.push(normalizePrettyEventLine(line, warnings, i + 1));
  }

  return { timeline, warnings };
}

function parseOrgchartHeader(line) {
  const m =
    /^orgchart\s+run=([^\s]+)\s+status=([^\s]+)\s+phase=([0-9?]+)\/([0-9?]+)\s*$/.exec(
      line.trim()
    );
  if (!m) return null;
  const phaseNo = m[3] === "?" ? null : Number(m[3]);
  const phaseTotal = m[4] === "?" ? null : Number(m[4]);
  return { run_id: m[1], status: m[2], phase_no: Number.isFinite(phaseNo) ? phaseNo : null, phase_total: Number.isFinite(phaseTotal) ? phaseTotal : null };
}

function parseRoleLine(line) {
  const t = line.trim();
  if (!t) return null;
  if (t.startsWith("(")) return null;

  const first = /^([a-z0-9_]+)\s+(.*)$/i.exec(t);
  if (!first) return null;
  const role = first[1].toLowerCase();
  const rest = first[2] || "";

  const canonical = parseCanonicalRecord(rest);
  if (canonical) return { role, ...canonical };

  // ACTIVE/STALLED form: "ACTIVE (123s)  label=..."
  let m = /^(ACTIVE|STALLED)\s+\((\d+)s\)\s+label=(.*)$/.exec(rest);
  if (m) {
    return { role, state: m[1], age_sec: Number(m[2]), label: m[3] || "" };
  }

  // Status form: "GREEN last=... msg..."
  m = /^([A-Z_]+)\s+last=([0-9T:\-]+)\s*(.*)$/.exec(rest);
  if (m) {
    return { role, status: m[1], last: m[2], msg: m[3] || "" };
  }

  // Loose fallback.
  return { role, raw: rest };
}

function parseWorktreeLine(line) {
  const t = line.trim();
  if (!t || t === "(none)") return null;

  const canonical = parseCanonicalRecord(t);
  if (canonical) {
    return {
      id: canonical.id ?? canonical.worktree_id ?? null,
      status: canonical.status ?? null,
      branch: canonical.branch ?? null,
      path: canonical.path ?? null,
      raw: t,
    };
  }

  const tokens = t.split(/\s+/);
  const id = tokens[0] || null;
  const status = tokens.length > 1 ? tokens[1] : null;

  const branchIdx = t.indexOf("branch=");
  if (branchIdx === -1) {
    return { id, status, branch: null, path: null, raw: t };
  }
  const after = t.slice(branchIdx + "branch=".length);
  const parts = after.split(/\s{2,}/); // branch and path are separated by 2 spaces in cmd_orgchart
  const branch = (parts[0] || "").trim() || null;
  const path = (parts.slice(1).join("  ") || "").trim() || null;
  return { id, status, branch, path };
}

export function parseState(text) {
  const warnings = [];
  const cleaned = stripAnsi(stripBom(normalizeNewlines(text)));
  const lines = cleaned.split("\n");

  const metadata = {
    run_id: null,
    status: null,
    phase_no: null,
    phase_total: null,
    roles: {},
  };

  const worktrees = [];

  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length) {
    const header = parseOrgchartHeader(lines[i]);
    if (header) {
      metadata.run_id = header.run_id;
      metadata.status = header.status;
      metadata.phase_no = header.phase_no;
      metadata.phase_total = header.phase_total;
    } else {
      warnings.push("could not parse orgchart header line");
    }
  } else {
    warnings.push("empty state text");
    return { worktrees: [], metadata, warnings };
  }

  let mode = null; // "roles" | "worktrees" | "failed"
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const t = line.trim();
    if (!t) continue;

    if (t.startsWith("roles (last event per role):")) {
      mode = "roles";
      continue;
    }
    if (t === "worktrees:" || t.startsWith("worktrees:")) {
      mode = "worktrees";
      continue;
    }
    if (t.startsWith("FAILED TASKS")) {
      mode = "failed";
      continue;
    }
    if (t.startsWith("orgchart")) continue;
    if (/^─{5,}$/.test(t)) continue;

    if (mode === "roles") {
      if (!/^\s{2}/.test(line)) continue;
      const parsed = parseRoleLine(line);
      if (parsed) {
        metadata.roles[parsed.role] = parsed;
      } else {
        warnings.push(`unparsed role line: ${t.slice(0, 120)}`);
      }
      continue;
    }

    if (mode === "worktrees") {
      if (!/^\s{2}/.test(line)) continue;
      const parsed = parseWorktreeLine(line);
      if (parsed) {
        worktrees.push({
          id: parsed.id ?? null,
          status: parsed.status ?? null,
          branch: parsed.branch ?? null,
          path: parsed.path ?? null,
        });
      } else {
        warnings.push(`unparsed worktree line: ${t.slice(0, 120)}`);
      }
      continue;
    }
  }

  return { worktrees, metadata, warnings };
}
