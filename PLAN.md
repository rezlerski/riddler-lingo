# Riddler-Lingo — Vokabel-Lern-App

Konzept für eine kleine Vokabel-Lern-App für die eigenen Kinder, lauffähig als
**Cloudflare Worker** mit **D1** als Datenbank und **Workers AI** zur Prüfung
der Eingaben beim Anlegen von Wörtern.

---

## Inhaltsverzeichnis

- [Riddler-Lingo — Vokabel-Lern-App](#riddler-lingo--vokabel-lern-app)
  - [Inhaltsverzeichnis](#inhaltsverzeichnis)
  - [1. Ziel \& Überblick](#1-ziel--überblick)
  - [2. Funktionsumfang](#2-funktionsumfang)
    - [Kinder-App](#kinder-app)
    - [Admin-Bereich](#admin-bereich)
  - [3. Das Lernkonzept — 4 Stufen](#3-das-lernkonzept--4-stufen)
  - [4. Technologie-Stack](#4-technologie-stack)
  - [5. Architektur](#5-architektur)
  - [6. Datenmodell (D1 / SQLite)](#6-datenmodell-d1--sqlite)
  - [7. KI-gestützte Eingabeprüfung (Workers AI)](#7-ki-gestützte-eingabeprüfung-workers-ai)
  - [8. Account-System \& Authentifizierung](#8-account-system--authentifizierung)
  - [9. Server-Endpunkte \& Actions](#9-server-endpunkte--actions)
    - [Auth](#auth)
    - [Kind / Lernen](#kind--lernen)
    - [Admin](#admin)
  - [10. Oberflächen (Screens)](#10-oberflächen-screens)
  - [11. Projektstruktur](#11-projektstruktur)
  - [12. Cloudflare-Konfiguration](#12-cloudflare-konfiguration)
  - [13. Umsetzungsplan (Meilensteine)](#13-umsetzungsplan-meilensteine)
  - [14. Spätere Erweiterungen](#14-spätere-erweiterungen)
  - [15. Offene Entscheidungen](#15-offene-entscheidungen)

---

## 1. Ziel & Überblick

Eine einfache, kindgerechte Web-App, in der Kinder Vokabeln in mehreren Stufen
üben, bis ein Wort als **„gelernt"** gilt. Ein **Admin-Bereich** (für dich) dient
zum Pflegen der Wörter und zum Einsehen der Lernerfolge.

Zwei Nutzerrollen:

- **Kind** — meldet sich einfach an (Avatar + PIN) und übt Vokabeln.
- **Admin** — verwaltet Kinder-Accounts, Wörter und sieht alle Erfolge & Fehler.

Alles läuft in **einem einzigen Cloudflare Worker**: **SvelteKit** rendert die
Seiten serverseitig und stellt zugleich die Server-Endpunkte bereit, spricht mit
**D1** (Datenbank) und **Workers AI** (Eingabeprüfung).

---

## 2. Funktionsumfang

### Kinder-App

- Einfacher Login (Avatar auswählen + 4-stellige PIN).
- Startseite mit Wortgruppen/Themen („Decks") und Lernfortschritt.
- Übungsmodus, der ein Wort durch die 4 Stufen führt.
- Sofortiges Feedback (richtig/falsch) und ein Fortschrittsbalken.
- Erfolgsanzeige: gelernte Wörter, Serie (Streak), kleine Pokale/Abzeichen.

### Admin-Bereich

- Kinder-Accounts anlegen / bearbeiten / PIN zurücksetzen.
- Wörter & Wortgruppen verwalten (anlegen, bearbeiten, löschen).
- **KI-Prüfung beim Anlegen** eines Wortes (siehe Abschnitt 7).
- **Optionales Bild je Wort** hochladen (gespeichert in R2).
- **Optionale Aussprache je Wort** erzeugen (TTS → R2).
- Erfolgsübersicht pro Kind: gelernte Wörter, Trefferquote, Serie.
- **Pro Wort sichtbar:**
  - **wann es zuletzt versucht wurde** (Datum/Uhrzeit),
  - **ob ein Fehler gemacht wurde und welcher** (eingegebene vs. erwartete
    Antwort, in welcher Stufe).

---

## 3. Das Lernkonzept — 4 Stufen

Jedes Wort durchläuft pro Kind vier aufeinander aufbauende Stufen — von „erkennen"
(passiv) bis „selbst schreiben" (aktiv). Eine Stufe wird durch eine **korrekte
Antwort** freigeschaltet; bei einer falschen Antwort bleibt das Wort auf der Stufe
und der Fehler wird protokolliert.

| Stufe | Name | Was das Kind sieht | Was das Kind tut |
|------:|------|--------------------|------------------|
| 1 | **Einfache Übersetzung** | Fremdwort + Übersetzung (+ optionales Bild) als Lernkarte, danach: „Was bedeutet *house*?" | Übersetzung eintippen (tolerant geprüft: Groß/Klein & Leerzeichen egal) |
| 2 | **Auswahl aus 3 Wörtern** | Übersetzung + 3 Fremdwörter zur Auswahl | Das richtige Wort antippen (2 Ablenker aus demselben Deck) |
| 3 | **Lücken füllen** | Fremdwort mit Lücken, z. B. `h_u_e` | Fehlende Buchstaben ergänzen |
| 4 | **Ganzes Wort schreiben** | Nur die Übersetzung | Das komplette Fremdwort tippen |

**Optionales Bild (Stufe 1):** Zu jedem Wort kann im Admin-Bereich ein Bild
hinterlegt werden (Upload nach **R2**). Ist eines vorhanden, wird es in Stufe 1 auf
der Lernkarte gezeigt — die Bild-Wort-Assoziation hilft Kindern beim Einprägen,
besonders bei konkreten Begriffen (Tiere, Gegenstände, Essen). Fehlt ein Bild,
läuft Stufe 1 unverändert ohne Bild.

**Optionale Sprachausgabe:** Zu jedem Wort kann eine **Aussprache** erzeugt werden
(Workers AI / MeloTTS). Die Audiodatei wird einmalig in R2 gespeichert; das Kind
kann das Fremdwort über ein Lautsprecher-Symbol anhören (in Stufe 1 und als Hilfe
auch in den Schreibstufen). Details & Sprachunterstützung in Abschnitt 7.

**Wann gilt ein Wort als „gelernt"?**
Wenn alle 4 Stufen korrekt absolviert wurden (`learned = 1`, Zeitpunkt in
`learned_at`).

**leichte Wiederholung (Spaced Repetition):**
Ein gelerntes Wort taucht nach einigen Tagen einmal in Stufe 4 zur Auffrischung
wieder auf. Felder `streak` und `next_review_at` sind dafür im Schema bereits
vorgesehen.

**Fehlerprotokoll:** Jeder Versuch (richtig wie falsch) wird in der Tabelle
`attempts` gespeichert — inklusive Stufe, eingegebener Antwort und erwarteter
Antwort. Daraus speist sich die Admin-Anzeige „zuletzt versucht / welcher Fehler".

---

## 4. Technologie-Stack

| Bereich | Wahl | Begründung |
|---------|------|------------|
| Laufzeit | **Cloudflare Workers** | Vorgabe; günstig/kostenlos, global |
| Datenbank | **Cloudflare D1** (SQLite) | Vorgabe; einfache SQL-Datenbank im Worker |
| Bilder-Speicher | **Cloudflare R2** | Optionale Wort-Bilder; S3-kompatibler Objektspeicher, direkt im Worker gebunden |
| Sprachausgabe (TTS) | **Workers AI** (`@cf/myshell-ai/melotts`) → R2 | Optionale Aussprache pro Wort; einmal erzeugt, als MP3 in R2 abgelegt. Browser-`SpeechSynthesis` als Fallback |
| App-Framework | **SvelteKit** (SSR) + `@sveltejs/adapter-cloudflare` | Server-gerendert; übernimmt Routing, Server-Endpunkte und Asset-Auslieferung — alles in **einem** Worker |
| KI | **Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) | Direkt im Worker, kein externer Dienst nötig |
| UI | **Svelte + Tailwind CSS** | Server-gerenderte Seiten mit interaktiven Inseln (Hydration) für angenehme Übungen |
| Auth | Signiertes Session-Cookie + Sessions-Tabelle in D1 | Einfach, ohne externen Identity-Provider |
| ORM (optional) | **Drizzle** | Typsichere Queries; optional, geht auch mit reinem SQL |

---

## 5. Architektur

```
                 ┌──────────────────────────────────────────────┐
  Browser  ───►  │            Cloudflare Worker                 │
  (Kind /        │            SvelteKit · SSR                   │
   Admin)        │                                              │
                 │  hooks.server.ts → Session/Rolle (locals)    │
                 │  routes/(learner) → Übungen (Actions)        │
                 │  routes/(admin)   → Wörter, Erfolge          │
                 │  routes/api/*    → +server.ts Endpunkte      │
                 │           │                  │               │
                 └───────────┼──────────────────┼──────────────┘
                             │                  │
                      ┌──────▼─────┐     ┌──────▼─────┐
                      │   D1 (DB)  │     │ Workers AI │
                      └────────────┘     └────────────┘
```

- **Ein** Worker, ein Deployment (SvelteKit-Build über den Cloudflare-Adapter).
- Seiten werden **serverseitig gerendert**; nur interaktive Teile hydrieren im Browser.
- Server-Logik in **Form-Actions** (`+page.server.ts`) und **API-Endpunkten** (`+server.ts`).
- Bindings (`DB`, `AI`) über `event.platform.env`; Rollen-Check zentral in `hooks.server.ts` → `event.locals.user`.

---

## 6. Datenmodell (D1 / SQLite)

Als D1-Migration unter `migrations/0001_init.sql`:

```sql
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
  streak          INTEGER NOT NULL DEFAULT 0,    -- für optionale Wiederholung
  next_review_at  TEXT,                          -- für optionale Wiederholung
  UNIQUE (user_id, word_id)
);

-- Protokoll JEDES Versuchs (liefert "wann + welcher Fehler")
CREATE TABLE attempts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id        INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  stage          INTEGER NOT NULL,              -- 1..4
  is_correct     INTEGER NOT NULL,              -- 0/1
  given_answer   TEXT,                          -- was das Kind eingegeben/gewählt hat
  expected_answer TEXT,                         -- was richtig gewesen wäre
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions (einfache Anmeldung über Cookie)
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,                 -- zufälliges Token
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indizes für schnelle Auswertungen
CREATE INDEX idx_words_deck       ON words(deck_id);
CREATE INDEX idx_progress_user    ON progress(user_id);
CREATE INDEX idx_attempts_word    ON attempts(word_id, created_at);
CREATE INDEX idx_attempts_user    ON attempts(user_id, created_at);
```

**Beispiel-Query für die Admin-Anzeige „zuletzt versucht + letzter Fehler"**
(pro Wort, für ein bestimmtes Kind):

```sql
SELECT
  w.id, w.term, w.translation,
  p.stage, p.learned, p.last_attempt_at,
  (SELECT a.given_answer || ' (statt: ' || a.expected_answer || ', Stufe ' || a.stage || ')'
     FROM attempts a
    WHERE a.word_id = w.id AND a.user_id = ? AND a.is_correct = 0
    ORDER BY a.created_at DESC LIMIT 1) AS last_mistake
FROM words w
LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
WHERE w.deck_id = ?
ORDER BY w.term;
```

---

## 7. KI-gestützte Eingabeprüfung (Workers AI)

Beim **Anlegen oder Bearbeiten eines Wortes** prüft ein kleines Sprachmodell die
Eingabe und gibt dir eine Rückmeldung, **bevor** gespeichert wird (du bestätigst
final selbst — „Human in the loop").

**Was geprüft wird:**

- Passt die Übersetzung zum Fremdwort (für das angegebene Sprachpaar)?
- Rechtschreibung von Wort und Übersetzung.
- Hinweis auf Mehrdeutigkeit / bessere/üblichere Übersetzung.

**Ablauf:**

1. Admin tippt `term`, `translation` (+ Sprachpaar) ein.
2. Frontend ruft `POST /api/admin/words/validate` auf.
3. Worker fragt **Workers AI** mit einem Prompt, der **striktes JSON** zurückgibt.
4. Antwort wird im Formular angezeigt: ✅ ok / ⚠️ Vorschlag / ❌ vermutlich falsch.
5. Admin speichert (ggf. mit übernommenem Korrekturvorschlag).

**Beispiel-Prompt (vereinfacht):**

```
System: Du bist ein Lektor für Vokabellisten. Antworte AUSSCHLIESSLICH mit JSON.
User:
Sprachpaar: Deutsch -> Englisch
Fremdwort (en): "house"
Übersetzung (de): "Haus"

Prüfe:
- ist die Übersetzung korrekt?
- gibt es Rechtschreibfehler?
- gibt es eine bessere/üblichere Übersetzung?

Antwortformat:
{"ok": boolean, "confidence": 0..1, "issues": [string], "suggestion": {"term": string, "translation": string} | null}
```

**Worker-Aufruf (Skizze):**

```ts
const res = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: buildUserPrompt(term, translation, langFrom, langTo) },
  ],
});
const verdict = safeParseJson(res.response); // robust gegen "fast-JSON"
```

> **Hinweise:** Workers AI hat ein kostenloses Tageskontingent (für den Eigenbedarf
> mehr als ausreichend). Die KI ist nur ein **Assistent** — final entscheidest du.
> JSON-Antworten von kleinen Modellen defensiv parsen (Fallback: „konnte nicht
> prüfen, bitte selbst kontrollieren").

### Sprachausgabe (TTS)

Optional kann zu jedem Wort eine Aussprache erzeugt werden — ebenfalls über
**Workers AI**:

- Modell **`@cf/myshell-ai/melotts`**; Eingabe `prompt` (= das Fremdwort) und `lang`
  (aus `language_to` des Decks), Ausgabe ist eine **MP3** (base64).
- Ablauf: Admin klickt „Aussprache erzeugen" → Worker ruft das Modell → speichert
  die MP3 in **R2** (`audio/<wort-id>.mp3`) → `audio_key` am Wort. Abspielen im
  Client direkt aus dem öffentlichen Bucket (`PUBLIC_IMAGE_BASE_URL + audio_key`) —
  also kein Kosten-/Latenzaufwand pro Anhören.
- **Sprachen MeloTTS:** u. a. Englisch, Spanisch, Französisch, Chinesisch,
  Japanisch, Koreanisch — **kein Deutsch** (genaue `lang`-Codes im Modell-Schema
  prüfen). Für nicht unterstützte Sprachen als **Fallback** die Browser-
  `SpeechSynthesis` (kostenlos, viele Sprachen inkl. Deutsch, Qualität
  geräteabhängig) oder ein externer TTS-Dienst.
- Deepgram **Aura** (`@cf/deepgram/aura-1` / `aura-2`, ebenfalls in Workers AI)
  liefert sehr natürliche Stimmen, ist aber auf Englisch ausgelegt.

---

## 8. Account-System & Authentifizierung

Bewusst einfach gehalten — es geht um die eigenen Kinder, nicht um Tausende Nutzer.

- **Kinder:** Login per **Avatar-Auswahl + 4-stellige PIN**. Keine E-Mail nötig.
- **Admin:** Login mit Name + längerem Passwort (du).
- **PIN/Passwort** werden gehasht gespeichert (z. B. PBKDF2/scrypt über die Web
  Crypto API, die in Workers verfügbar ist — **kein Klartext**).
- Nach Login: Session-Token (zufällig) in Tabelle `sessions`, als **httpOnly,
  Secure, SameSite=Lax Cookie** im Browser.
- `hooks.server.ts` liest das Cookie, lädt die Session und legt den Nutzer in
  `event.locals.user` ab.
- Geschützte Bereiche (`(admin)`-Routen) prüfen `locals.user?.role === 'admin'`.

> Den ersten Admin-Account legst du per **Seed-Skript / Migration** an (oder ein
> einmaliger Setup-Endpunkt, der sich nach dem ersten Anlegen deaktiviert).

---

## 9. Server-Endpunkte & Actions

In SvelteKit kommen Seitendaten aus `load()`-Funktionen, Mutationen laufen über
**Form-Actions** (`+page.server.ts`), und JSON-artige Aufrufe aus interaktiven
Inseln über **`+server.ts`**-Endpunkte. Alle Logik liegt serverseitig.

### Auth
- Login / Logout als Form-Actions (`/login`) — setzt bzw. löscht das Session-Cookie.
- Der aktuelle Nutzer steht über `locals.user` in jedem `load()` bereit.

### Kind / Lernen
- `load()` der Deck-Übersicht — Wortgruppen mit Fortschritt des Kindes.
- `GET /api/learn/next?deckId=…` (`+server.ts`) — nächstes fälliges Wort **inkl.
  Stufe & Aufgabe** (Stufe 2: 3 Auswahloptionen; Stufe 3: Wort mit Lücken — die
  korrekte Lösung bleibt serverseitig).
- `POST /api/learn/answer` (`+server.ts`) — `{ wordId, stage, answer }` → prüft
  serverseitig, protokolliert in `attempts`, aktualisiert `progress`, antwortet
  `{ correct, expected, newStage, learned }`.
- `load()` der Erfolgsseite — gelernt, Quote, Serie, Abzeichen.

### Admin
- Decks / Wörter / Kinder-Accounts: `load()` zum Anzeigen, Form-Actions zum
  Anlegen / Bearbeiten / Löschen (inkl. PIN zurücksetzen).
- `POST /api/admin/words/validate` (`+server.ts`) — **KI-Prüfung** (Abschnitt 7),
  aufgerufen aus dem Wort-Formular vor dem Speichern.
- `POST /api/admin/words/[id]/image` (`+server.ts`, multipart) — **Bild-Upload**:
  Typ/Größe prüfen, nach R2 schreiben (`platform.env.BUCKET.put`), `image_key` am
  Wort speichern. `DELETE` entfernt Eintrag + Objekt wieder.
- `POST /api/admin/words/[id]/audio` (`+server.ts`) — **Aussprache erzeugen**: ruft
  Workers AI (MeloTTS) mit Wort + Deck-Sprache, schreibt die MP3 nach R2, setzt
  `audio_key`. `DELETE` entfernt sie wieder.
- `load()` der Erfolgsübersicht — pro Wort **„zuletzt versucht / letzter Fehler"**
  (Parameter: Kind, Deck).

### Bilder
- Der R2-Bucket ist über eine **Custom-Domain öffentlich** erreichbar; die App lädt
  Bilder direkt von dort: `Bild-URL = PUBLIC_IMAGE_BASE_URL + image_key`.
- Zum **Ausliefern** ist daher keine Worker-Route nötig (nur der Upload läuft über
  den Worker); Bilder werden von Cloudflare gecacht.

> **Wichtig:** Die Korrektheitsprüfung der Antworten passiert **immer serverseitig**,
> nie im Browser — sonst könnten die Kinder die Lösungen im Quelltext sehen.

---

## 10. Oberflächen (Screens)

**Kind**
1. Login (Avatare zum Antippen + PIN-Pad).
2. Übersicht der Wortgruppen mit Fortschrittsbalken.
3. Übungsbildschirm (je nach Stufe unterschiedliche Aufgabe), Feedback,
   Fortschrittsbalken, „Weiter".
4. Erfolgsseite (gelernte Wörter, Serie, Abzeichen/Pokale).

**Admin**
1. Login.
2. Dashboard: Kinder-Kacheln mit Kennzahlen (gelernt / in Arbeit / Quote).
3. Wortgruppen- & Wörter-Verwaltung (Tabelle + Formular **mit KI-Prüfung**).
4. Wort-Detail: Verlauf pro Kind — **zuletzt versucht**, **letzter Fehler**,
   aktuelle Stufe.
5. Kinder-Verwaltung (anlegen, PIN zurücksetzen).

---

## 11. Projektstruktur

```
riddler-lingo/
├─ PLAN.md
├─ package.json
├─ svelte.config.js          # Cloudflare-Adapter
├─ vite.config.ts
├─ wrangler.toml
├─ tsconfig.json
├─ migrations/
│  └─ 0001_init.sql
└─ src/
   ├─ app.d.ts               # App.Platform (DB, AI) & App.Locals (user) typisieren
   ├─ hooks.server.ts        # Session aus Cookie → locals.user, Rollenschutz
   ├─ lib/
   │  └─ server/             # läuft NUR serverseitig (nie im Client-Bundle)
   │     ├─ db.ts            # D1-Zugriff / Queries (oder Drizzle)
   │     ├─ auth.ts          # Login, Sessions, Hashing
   │     ├─ learn.ts         # Stufen-Logik, Antwortprüfung, Aufgaben bauen
   │     └─ ai.ts            # Workers-AI-Eingabeprüfung
   └─ routes/
      ├─ +layout.svelte
      ├─ login/              # +page.svelte, +page.server.ts (Action)
      ├─ (learner)/          # geschützt: Decks, Übung, Fortschritt
      │  ├─ +layout.server.ts
      │  ├─ decks/           # +page.server.ts (load)
      │  ├─ practice/        # Übungs-UI je Stufe (Komponenten)
      │  └─ progress/        # Erfolge des Kindes
      ├─ (admin)/            # geschützt: nur role=admin
      │  ├─ +layout.server.ts
      │  ├─ words/           # CRUD + KI-Prüfung + Bild/Audio
      │  ├─ learners/        # Accounts + PIN zurücksetzen
      │  └─ stats/           # „zuletzt versucht / letzter Fehler" pro Wort
      └─ api/
         ├─ learn/next/+server.ts
         ├─ learn/answer/+server.ts
         ├─ admin/words/validate/+server.ts
         ├─ admin/words/[id]/image/+server.ts   # Bild-Upload/-Löschen (R2)
         └─ admin/words/[id]/audio/+server.ts   # Aussprache erzeugen/löschen (TTS→R2)
```

Serverseitiger Code liegt unter `src/lib/server/` und landet dadurch garantiert
nicht im Client-Bundle. Die UI-Übung pro Stufe sind kleine Svelte-Komponenten
unter `routes/(learner)/practice/`.

---

## 12. Cloudflare-Konfiguration

**`svelte.config.js`** (Cloudflare-Adapter; `platformProxy` macht D1/AI lokal im
Dev verfügbar):

```js
import adapter from "@sveltejs/adapter-cloudflare";

export default {
  kit: {
    adapter: adapter({
      platformProxy: { configPath: "wrangler.toml" },
    }),
  },
};
```

**`wrangler.toml`** (Skizze):

```toml
name = "riddler-lingo"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]

# vom SvelteKit-Adapter erzeugte Worker-Ausgabe
main = ".svelte-kit/cloudflare/_worker.js"
assets = { binding = "ASSETS", directory = ".svelte-kit/cloudflare" }

# D1-Datenbank
[[d1_databases]]
binding = "DB"
database_name = "riddler-lingo"
database_id = "<wird-von-wrangler-erzeugt>"

# Workers AI
[ai]
binding = "AI"

# R2 (optionale Wort-Bilder)
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "riddler-lingo-images"

[vars]
# Custom-Domain des öffentlichen R2-Buckets (für die Bild-URLs)
PUBLIC_IMAGE_BASE_URL = "https://img.example.com/"
```

Bindings im Code über `event.platform.env.DB`, `…AI` und `…BUCKET`; die Typen in
`src/app.d.ts` unter `App.Platform` hinterlegen. Den R2-Bucket einmalig über eine
**Custom-Domain öffentlich** schalten (R2 → Settings → Public access / Custom
Domain); diese Domain landet in `PUBLIC_IMAGE_BASE_URL` und wird im Client über
`$env/static/public` gelesen.

Wichtige Befehle:

```bash
# einmalig: D1-Datenbank und R2-Bucket anlegen
npx wrangler d1 create riddler-lingo
npx wrangler r2 bucket create riddler-lingo-images

# Migration lokal & remote ausführen
npx wrangler d1 migrations apply riddler-lingo --local
npx wrangler d1 migrations apply riddler-lingo --remote

# lokal entwickeln (Vite-Dev inkl. emulierter Cloudflare-Bindings)
npm run dev

# bauen & deployen
npm run build
npx wrangler deploy
```

> Secrets (z. B. ein Schlüssel zum Signieren von Cookies) via
> `npx wrangler secret put SESSION_SECRET`.

---

## 13. Umsetzungsplan (Meilensteine)

**M1 — Grundgerüst**
- SvelteKit-Projekt mit Cloudflare-Adapter aufsetzen, „Hello World" deployen.
- D1 anlegen, Migration `0001_init.sql` ausführen, Bindings (`DB`, `AI`) verdrahten.

**M2 — Accounts & Login**
- Hashing, Sessions, Login/Logout, Rollen-Middleware.
- Ersten Admin seeden; Admin kann Kinder-Accounts anlegen.

**M3 — Wörter verwalten (Admin)**
- Decks & Wörter CRUD.
- **KI-Eingabeprüfung** beim Anlegen/Bearbeiten.
- Optionaler **Bild-Upload nach R2** je Wort; Bucket über Custom-Domain öffentlich.
- Optionale **Aussprache (TTS)** je Wort erzeugen und in R2 ablegen.

**M4 — Lernen (Kind), die 4 Stufen**
- `learn/next` + `learn/answer` mit serverseitiger Prüfung.
- Stufenlogik, Protokoll in `attempts`, Fortschritt in `progress`.
- Übungs-UI je Stufe.

**M5 — Erfolge & Auswertung**
- Kind: Statistiken & Abzeichen.
- Admin: Erfolgsübersicht + **„zuletzt versucht / letzter Fehler" pro Wort**.

**M6 — Feinschliff**
- Kindgerechtes Design, Sounds/Animationen, Fehlertoleranz bei Eingaben.
- Leichte Wiederholung (Spaced Repetition) scharf schalten (`streak` / `next_review_at`).

---

## 14. Spätere Erweiterungen

- KI-Check, ob das hochgeladene Bild zum Wort passt (Bild → Text).
- CSV-/Bulk-Import von Vokabellisten (mit KI-Sammelprüfung).
- Tages-Ziele & Eltern-Wochenbericht.
- Mehrere Sprachen / Sprachrichtungen pro Kind.

---

## 15. Offene Entscheidungen

Bereits entschieden: **Frontend = SvelteKit (SSR)** · **Spaced Repetition ist Teil
von v1**.

Bitte bei Gelegenheit noch bestätigen — ich habe jeweils eine Empfehlung gesetzt:

1. **Sprachrichtung:** Immer fest Deutsch → Fremdsprache, oder beide Richtungen?
2. **Stufe 1 „einfache Übersetzung":** freie Eingabe (tolerant geprüft)
   *(empfohlen)* oder reine Karteikarte mit „gewusst / nicht gewusst"?
3. **KI-Modell:** `@cf/meta/llama-3.1-8b-instruct` als Standard ok, oder ein
   anderes Workers-AI-Modell?
```
