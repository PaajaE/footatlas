/**
 * Migrace databáze kroniky (docs/kronika-sqlite.md). Pole je po verzích: `MIGRATIONS[0]` vytvoří verzi 1,
 * další prvky přidávat dole, nikdy neměnit už vydané. Čisté řetězce bez závislosti na React Native,
 * aby šly spustit i v testech nad `node:sqlite`.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE daily_motion (
    day            TEXT    NOT NULL,
    source         TEXT    NOT NULL CHECK (source IN ('health_connect', 'healthkit', 'takeout', 'gpx')),
    steps          INTEGER,
    raw_distance_m REAL,
    distance_m     REAL    NOT NULL,
    confidence     TEXT    NOT NULL CHECK (confidence IN ('verified', 'estimated')),
    rule_version   INTEGER NOT NULL,
    step_length_m  REAL    NOT NULL,
    read_at        TEXT    NOT NULL,
    PRIMARY KEY (day, source)
  ) WITHOUT ROWID;

  CREATE TABLE source_state (
    source          TEXT PRIMARY KEY,
    oldest_day      TEXT,
    last_read_at    TEXT,
    history_granted INTEGER NOT NULL DEFAULT 0
  ) WITHOUT ROWID;
  `,
  // Verze 2: rozjetá výprava (nahrazuje AsyncStorage `footatlas.session.v1`, rozhodnutí 0007).
  `
  CREATE TABLE expedition_run (
    id                 INTEGER PRIMARY KEY,
    expedition_id      TEXT NOT NULL,
    status             TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    last_seen_walked_m REAL NOT NULL DEFAULT 0 CHECK (last_seen_walked_m >= 0),
    final_walked_m     REAL,
    finished_at        TEXT
  );
  -- V MVP nejvýš jedna rozjetá výprava (spec 5.3), ať je aktivní nebo pozastavená.
  CREATE UNIQUE INDEX one_running_run ON expedition_run ((1)) WHERE status IN ('active', 'paused');

  CREATE TABLE expedition_period (
    run_id   INTEGER NOT NULL REFERENCES expedition_run (id) ON DELETE CASCADE,
    start_at TEXT    NOT NULL,
    end_at   TEXT,
    PRIMARY KEY (run_id, start_at)
  ) WITHOUT ROWID;
  `,
  // Verze 3: co se na výpravě stalo (dosažená místa, etapy, cíl) a kdy, aby datum nezáviselo na otevření aplikace.
  `
  CREATE TABLE expedition_event (
    run_id      INTEGER NOT NULL REFERENCES expedition_run (id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL CHECK (kind IN ('place', 'stage', 'finish')),
    ref         TEXT    NOT NULL,
    at_m        REAL    NOT NULL,
    reached_day TEXT    NOT NULL,
    noticed_at  TEXT    NOT NULL,
    PRIMARY KEY (run_id, kind, ref)
  ) WITHOUT ROWID;
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;
