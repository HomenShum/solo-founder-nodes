// SoloControlPlane - durable loop state, approvals, triggers, traces, and improvement queue.
export const CONTROL_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS control_loops (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  budget_usd REAL NOT NULL,
  spent_usd REAL NOT NULL DEFAULT 0,
  policy_json TEXT NOT NULL,
  context_receipt_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_control_loops_project ON control_loops(project_id, created_at);

CREATE TABLE IF NOT EXISTS control_phase_runs (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  checkpoint_json TEXT NOT NULL,
  blocker TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_phase_runs_loop ON control_phase_runs(loop_id, phase, attempt);

CREATE TABLE IF NOT EXISTS control_events (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(source, idempotency_key),
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_events_loop ON control_events(loop_id, created_at);

CREATE TABLE IF NOT EXISTS control_approvals (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL,
  decision_json TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_approvals_loop ON control_approvals(loop_id, status);

CREATE TABLE IF NOT EXISTS control_traces (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  attrs_json TEXT NOT NULL,
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_traces_loop ON control_traces(loop_id, phase, started_at);

CREATE TABLE IF NOT EXISTS control_improvements (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  source_trace_id TEXT,
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  patch_hint TEXT NOT NULL,
  status TEXT NOT NULL,
  score_delta REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_improvements_loop ON control_improvements(loop_id, status);

CREATE TABLE IF NOT EXISTS control_worktrees (
  id TEXT PRIMARY KEY,
  loop_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  path TEXT NOT NULL,
  branch TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  released_at INTEGER,
  FOREIGN KEY(loop_id) REFERENCES control_loops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_control_worktrees_loop ON control_worktrees(loop_id, status);
`;
