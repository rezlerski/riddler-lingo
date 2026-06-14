-- Riddler-Lingo — Initiales Schema (D1 / SQLite)

-- Nutzer: Kinder und Admin
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'child' CHECK (role IN ('child','admin')),
  avatar      TEXT,                       -- z. B. Emoji oder Avatar-Name
  pin_hash    TEXT    NOT NULL,           -- gehashte PIN (Kind) bzw. Passwort (Admin)
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Wortgruppen / Themen / Lektionen
CREATE TABLE decks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,            -- z. B. "Englisch – Tiere"
  language_from TEXT NOT NULL,            -- Sprache der Übersetzung, z. B. "de"
  language_to   TEXT NOT NULL,            -- Sprache des Wortes, z. B. "en"
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Einzelne Vokabeln
CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id     INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term        TEXT    NOT NULL,           -- Fremdwort, z. B. "house"
  translation TEXT    NOT NULL,           -- Übersetzung, z. B. "Haus"
  hint        TEXT,                       -- optionale Eselsbrücke
  example     TEXT,                       -- optionaler Beispielsatz
  image_key   TEXT,                       -- optionaler R2-Objektschlüssel (Bild)
  audio_key   TEXT,                       -- optionaler R2-Objektschlüssel (Aussprache, MP3)
  created_by  INTEGER REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lernstand je Kind je Wort
CREATE TABLE progress (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id         INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  stage           INTEGER NOT NULL DEFAULT 1,   -- aktuelle Stufe 1..4
  learned         INTEGER NOT NULL DEFAULT 0,   -- 0/1
  learned_at      TEXT,
  last_attempt_at TEXT,                          -- "zuletzt versucht"
  streak          INTEGER NOT NULL DEFAULT 0,    -- fuer optionale Wiederholung
  next_review_at  TEXT,                          -- fuer optionale Wiederholung
  UNIQUE (user_id, word_id)
);

-- Protokoll JEDES Versuchs (liefert "wann + welcher Fehler")
CREATE TABLE attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id         INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  stage           INTEGER NOT NULL,              -- 1..4
  is_correct      INTEGER NOT NULL,              -- 0/1
  given_answer    TEXT,                          -- was das Kind eingegeben/gewaehlt hat
  expected_answer TEXT,                          -- was richtig gewesen waere
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions (einfache Anmeldung ueber Cookie)
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,                  -- zufaelliges Token
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indizes fuer schnelle Auswertungen
CREATE INDEX idx_words_deck    ON words(deck_id);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_attempts_word ON attempts(word_id, created_at);
CREATE INDEX idx_attempts_user ON attempts(user_id, created_at);
