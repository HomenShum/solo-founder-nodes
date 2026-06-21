// SoloLedger — local SQLite/libSQL schema for the honest-lane eval ledger.
export const LEDGER_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS ledger_runs (
  id TEXT PRIMARY KEY,
  iteration_label TEXT NOT NULL,
  benchmark TEXT NOT NULL,
  model TEXT,
  materializer_mode TEXT NOT NULL,
  nonce TEXT NOT NULL,
  status TEXT NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  headline_mean REAL,
  headline_n INTEGER,
  chain_head TEXT NOT NULL DEFAULT 'GENESIS'
);

CREATE TABLE IF NOT EXISTS ledger_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  reward REAL NOT NULL,
  fired_writer_leaf TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  transport_nonce_valid INTEGER NOT NULL,
  derived_clean INTEGER NOT NULL,
  quarantined INTEGER NOT NULL,
  counts_toward_headline INTEGER NOT NULL,
  reasons TEXT NOT NULL,
  payload TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_tasks_run ON ledger_tasks(run_id, created_at);

-- S12: immutable split assignment. A task's first-seen split is permanent; tuned can never become held-out.
CREATE TABLE IF NOT EXISTS split_ledger (
  task_id TEXT PRIMARY KEY,
  split TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  manifest_hash TEXT
);

CREATE TABLE IF NOT EXISTS sealed_manifest (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hash TEXT NOT NULL,
  task_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
`;
