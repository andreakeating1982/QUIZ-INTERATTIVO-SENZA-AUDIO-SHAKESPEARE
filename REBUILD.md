# ♻️ REBUILD — Ricostruire l'app identica (per agenti IA)

> **A chi serve:** a un agente IA (o a uno sviluppatore) che parte da **questa repository GitHub**
> (o dal pacchetto ZIP) e deve **ricostruire l'app QUIZ INTERATTIVO SORGENTE esattamente com'è**,
> senza cambiare nulla, prima di creare una variante (vedi `ADATTARE.md`).

---

## 1. Cos'è questa app

**QUIZ INTERATTIVO SORGENTE** (storico nome: *Shakespeare Quiz Interattivo*) è un'app full-stack
per quiz in classe in tempo reale:

- **Docente** (`/docente`): apre una classe con codice a 4 cifre, avvia la sessione, fa avanzare
  le domande, mostra la risposta esatta, vede i punteggi in diretta e scarica i **report PDF**
  (report studente + questionario in bianco) in **OpenDyslexic ≥ 14 pt, interlinea 1.5**, ciascuno
  su **UNA facciata per studente** con il riquadro **PUNTEGGIO** (PLUM, 2 righe) mai spezzato. Nel
  report la scelta è marcata con i **simboli vettoriali ✔ (verde scuro) / ✘ (rossa)** subito dopo
  la lettera dell'opzione (opzione esatta non scelta in verde); NIENTE sezione
  "RISPOSTE CORRETTE/INCORRETTE" né scritta "RISPOSTA DELLO STUDENTE" (layout v2 2026-09-04).
- **Studente** (`/quiz`): inserisce nome + codice, risponde alle domande (scelta multipla, 2+ opzioni),
  vede il proprio esito.
- **Accessibilità inclusa** (dal 2026-09-03): font **OpenDyslexic**, barra accessibilità a 5 moduli
  (FONT / INTERLINEA / RIGHELLO / MODALITÀ / ASCOLTO-TTS), altezza dinamica per embed in iframe
  (protocollo `labvisivo:height`), stato online/errore, `prefers-reduced-motion`, misure screen reader.
  → Dettagli in `ACCESSIBILITA.md`.
- **Cornice dinamica per Blogger/siti**: cartella `cornice-dinamica/` (embed dedicata/lite/universale
  + test + fonts + README). → Dettagli in `cornice-dinamica/README.md`.

---

## 2. Stack reale (⚠️ NIENTE SQLite)

| Componente | Tecnologia |
|---|---|
| Frontend | Vite + React 19 + TypeScript + TailwindCSS |
| Backend | Express + tRPC (`@trpc/server`) |
| Database | **PostgreSQL** via `drizzle-orm/postgres-js` + driver `postgres` (schema `pgTable` in `drizzle/schema.ts`) |
| ORM / migrazioni | Drizzle (`drizzle-kit generate / migrate / push`) |
| PDF | jsPDF |
| Auth | Better Auth (sessioni) |
| Scaffold | `web-db-user` (Easy-Peasy AI) |

> ⚠️ Documenti molto vecchi (README/skill precedenti) citano "SQLite (Better-SQLite3)": **è obsoleto**.
> Il codice attuale usa **PostgreSQL** (`server/db.ts` importa `drizzle-orm/postgres-js` e `postgres`;
> `drizzle/schema.ts` usa `pgTable`). In locale Easy-Peasy il DB è un Postgres Neon; su Render viene
> creato automaticamente dal `render.yaml` Blueprint.

---

## 3. Requisiti

- **Node.js ≥ 20** e **pnpm ≥ 10** (`corepack enable` se disponibile).
- Un **PostgreSQL raggiungibile** (locale, Neon, Supabase, Render…) — serve solo `DATABASE_URL`.
- Git (per usare la repo GitHub).

---

## 4. Ricostruzione passo-passo

### 4.1 Ottieni il codice

```bash
git clone https://github.com/IL-TUO-UTENTE/IL-TUO-REPO.git quiz-interattivo
cd quiz-interattivo
```

Oppure estrai il pacchetto ZIP (il contenuto è identico alla repo).

### 4.2 Installa le dipendenze

```bash
pnpm install
```

### 4.3 Configura l'ambiente

```bash
cp .env.example .env
```

Poi valorizza **al minimo**:

```bash
DATABASE_URL=postgresql://utente:password@host:5432/nome_db
BETTER_AUTH_SECRET=<stringa casuale lunga>     # genera: openssl rand -base64 32
NODE_ENV=development                            # o production
```

> Su **Render** non serve creare `.env`: il Blueprint `render.yaml` crea database e segreti e li
> inietta da solo. In locale sì.

### 4.4 Crea/aggiorna lo schema del database

```bash
pnpm db:push     # = drizzle-kit generate && drizzle-kit migrate
```

(Su Render il container esegue automaticamente `drizzle-kit push` all'avvio — vedi `RENDER.md`.)

### 4.5 Avvio in sviluppo

```bash
pnpm dev
```

L'app risponde su `http://localhost:3000` (o porta libera successiva). Pagine: `/` (prima pagina),
`/docente`, `/quiz`.

### 4.6 Verifiche obbligatorie (prima di qualsiasi modifica)

```bash
pnpm check                 # TypeScript: nessun errore
pnpm test                  # test vitest (auth.logout)
```

**Verifica dei file mirror** — 4 coppie devono restare IDENTICHE:

```bash
diff questions.ts server/questions.ts
diff TeacherPage.tsx client/src/pages/TeacherPage.tsx
diff StudentQuiz.tsx client/src/pages/StudentQuiz.tsx
diff reportPdf.ts client/src/lib/reportPdf.ts
```

Nessun output = identiche. In caso di differenza, riallineare PRIMA di proseguire.

### 4.7 Build di produzione (locale / verifica)

```bash
pnpm build      # vite build (client → dist/public) + esbuild (server → dist/index.js)
NODE_ENV=production node dist/index.js   # oppure: pnpm start
```

Il server di produzione serve i file statici da `dist/public` (vedi `server/_core/static.ts`) e
risponde a `/_health`.

---

## 5. Struttura chiave (mappa per l'agente IA)

```
├── questions.ts                  ⚠️ MIRROR di server/questions.ts (le DOMANDE)
├── TeacherPage.tsx               ⚠️ MIRROR di client/src/pages/TeacherPage.tsx
├── StudentQuiz.tsx               ⚠️ MIRROR di client/src/pages/StudentQuiz.tsx
├── reportPdf.ts                  ⚠️ MIRROR di client/src/lib/reportPdf.ts
├── routers.ts                    ⚠️ validatori API (ref /10 sostituiti dinamicamente)
├── client/
│   ├── index.html                <title> + niente script legacy di altezza
│   ├── public/fonts/             OpenDyslexic (Regular/Bold/Italic .ttf/.otf/.woff2)
│   └── src/
│       ├── pages/Home.tsx        Prima pagina (margini pareggiati, lf-welcome)
│       ├── pages/TeacherPage.tsx Pannello docente
│       ├── pages/StudentQuiz.tsx Interfaccia studente (opzioni MC)
│       ├── lib/reportPdf.ts      PDF (report + bianco + riquadro PUNTEGGIO)
│       ├── lib/heightSync.ts     Altezza dinamica embed (labvisivo:height)
│       ├── contexts/AccessibilityContext.tsx   Barra accessibilità (stato, localStorage sq_access)
│       ├── components/AccessibilityToolbar.tsx Barra accessibilità (5 moduli)
│       ├── hooks/useReadAloud.ts               Lettura ad alta voce (TTS italiano)
│       └── index.css             @font-face OpenDyslexic, variabili --lf-scale/--lf-lh, lf-ruler/lf-hc/lf-embedded
├── server/
│   ├── questions.ts              ⚠️ MIRROR domande (usato dal backend)
│   ├── routers.ts                API tRPC (domande senza risposte / check / submit)
│   ├── db.ts                     Client PostgreSQL + query helper + getReportData
│   └── _core/                    Scaffold (index.ts, static.ts, auth, trpc, env)
├── drizzle/                      schema.ts (pgTable) + migrazioni SQL
├── Dockerfile                    ✅ Build COMPLETO dal sorgente (install + pnpm build + migrazioni all'avvio) — usato da docker-compose e deploy generici
├── deploy/Dockerfile             ✅ Stesso build completo (per chi vuole -f deploy/Dockerfile)
├── deploy/Dockerfile.render      ✅ Dockerfile per Render (multi-stage: build + runtime prod + drizzle-kit push all'avvio) — referenziato da render.yaml
├── deploy/docker-entrypoint.sh   Esegue `drizzle-kit push` poi avvia il server (usato da tutti i Dockerfile)
├── .dockerignore                 Esclude node_modules/.git/dist/.env e guide pesanti dal contesto di build
├── render.yaml                   Blueprint Render (Postgres free + Web Service Docker, dockerfilePath: ./deploy/Dockerfile.render)
├── cornice-dinamica/             ⭐ Cornice per Blogger (embed HTML + fonts + README)
├── skills/                       Le 3 skill (quiz-interattivo-sorgente, quiz-adapter, shakespeare-quiz)
├── ADATTARE.md                   Guida alle VARIANTI (contenuto / numero / TIPOLOGIA domande)
├── RENDER.md                     Guida trasferimento Easy-Peasy AI → GitHub → Render
├── ACCESSIBILITA.md              ⭐ Sezione ACCESSIBILITÀ (misure riusabili)
├── AGENTS.md                     Istruzioni operative per agenti IA
└── README.md                     Panoramica utente
```

---

## 6. Criteri di "ricostruzione riuscita"

1. `pnpm install` + `pnpm check` senza errori.
2. `pnpm db:push` applicato su un DB Postgres vuoto senza errori.
3. `pnpm dev` → `/` mostra la prima pagina con la barra accessibilità; `/docente` apre una classe;
   `/quiz` si unisce con un codice.
4. Report PDF scaricabili con il riquadro PUNTEGGIO su un'unica facciata.
5. `diff` sui 4 mirror → nessuna differenza.
6. Le 10 domande di default (Shakespeare) sono presenti e rispondibili.

Se l'obiettivo è **cambiare le domande** (contenuto, numero, TIPOLOGIA) → **NON modificare a mano**:
segui `ADATTARE.md` (e le skill in `skills/`).
