# Riddler-Lingo 🦉

Vokabel-Lern-App für Kinder — SvelteKit (SSR) auf Cloudflare Workers, mit D1
(Datenbank), R2 (Bilder/Audio) und Workers AI (Eingabeprüfung + Text-to-Speech).

Konzept & Architektur: siehe [PLAN.md](./PLAN.md).

## Stack

- **SvelteKit** (SSR) + `@sveltejs/adapter-cloudflare` (Target: Workers)
- **Tailwind CSS** v4
- **D1** (SQLite), **R2** (Objektspeicher), **Workers AI**
- Bindings sind in [`wrangler.jsonc`](./wrangler.jsonc) definiert: `DB`, `AI`, `BUCKET`, `ASSETS`

## Voraussetzungen

- Node.js + npm
- Für Remote-Deploys: ein Cloudflare-Account (`npx wrangler login`)

## Erste Schritte (lokal)

```sh
npm install

# Cloudflare-Typen (Env) aus wrangler.jsonc generieren
npm run gen

# D1-Schema lokal anlegen
npx wrangler d1 migrations apply riddler-lingo --local

# Dev-Server (mit emulierten Cloudflare-Bindings)
npm run dev
```

Die Startseite zeigt einen **System-Status** (Bindings + DB-Tabellen) zur
Verifikation des Grundgerüsts.

## Nützliche Befehle

```sh
npm run check     # wrangler types + svelte-check (Typecheck)
npm run build     # Production-Build (für Cloudflare)
npm run preview   # gebauten Worker lokal via wrangler ausführen
```

## Deployment (später)

```sh
# einmalig: D1-Datenbank und R2-Bucket anlegen (echte IDs/Namen)
npx wrangler d1 create riddler-lingo          # database_id in wrangler.jsonc eintragen
npx wrangler r2 bucket create riddler-lingo-images

# Migration auf die Remote-DB anwenden
npx wrangler d1 migrations apply riddler-lingo --remote

npm run build && npx wrangler deploy
```

## Migrationen

SQL-Migrationen liegen in [`migrations/`](./migrations). Neue Migration anlegen:

```sh
npx wrangler d1 migrations create riddler-lingo <name>
```

## Roadmap

Meilensteine M1–M6 in [PLAN.md](./PLAN.md#13-umsetzungsplan-meilensteine).
**M1 (Grundgerüst)** ist umgesetzt. Als Nächstes: **M2 — Accounts & Login**.
