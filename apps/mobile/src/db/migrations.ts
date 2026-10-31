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
];

export const SCHEMA_VERSION = MIGRATIONS.length;
