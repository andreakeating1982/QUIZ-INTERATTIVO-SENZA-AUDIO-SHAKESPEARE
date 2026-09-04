# 📚 QUIZ INTERATTIVO SORGENTE

App full-stack per quiz in classe, in tempo reale: gli studenti si uniscono con un codice a 4 cifre, rispondono alle domande a scelta multipla e il docente vede i punteggi in diretta, con report PDF scaricabili. Originariamente creata come **"Shakespeare Quiz Interattivo"**, questa app è ora il **QUIZ INTERATTIVO SORGENTE**: la base da cui si generano nuove app identiche con un set di domande diverso.

- **Stack:** Vite + React + TypeScript + Tailwind + tRPC + Drizzle ORM + PostgreSQL + jsPDF
- **Deploy:** Docker / Render / Railway / hosting proprio
- **Report PDF accessibili (v2):** report studente e quiz in bianco generati in **OpenDyslexic ≥ 14 pt, interlinea 1.5**, sempre su **UNA facciata per studente**. Nel report la scelta è marcata con **simboli vettoriali ✔ (verde scuro) / ✘ (rossa)** subito dopo la lettera dell'opzione (l'opzione esatta non scelta è in verde); in fondo c'è il riquadro **PUNTEGGIO** PLUM a 2 righe (`PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`) **mai spezzato** tra due pagine (preflight reale). Nessuna sezione "RISPOSTE CORRETTE/INCORRETTE" né scritta "RISPOSTA DELLO STUDENTE". → Dettagli in `ACCESSIBILITA.md`.
- **Questo pacchetto include le skill di clonazione** (cartella `skills/`): chi le usa (Marky) può ricostruire l'app identica cambiando solo le domande, **anche a partire da questa repository GitHub** (vedi `GUIDA-SKILL-GITHUB.md`).
- **Pacchetto orientato agli agenti IA**: i documenti `REBUILD.md` (ricostruzione identica), `ADATTARE.md` (varianti: contenuto, numero e **tipologia** delle domande — VERO/FALSO, risposta multipla 3-4 opzioni, fill-in-the-blanks, abbinamento immagine-parola, riordino, risposta breve), `RENDER.md` (Easy-Peasy AI → GitHub → Render), `ACCESSIBILITA.md` (⭐ sezione accessibilità con misure riusabili) e `AGENTS.md` (istruzioni operative) sono pensati per essere letti e seguiti automaticamente.

---

## 🎯 Creare una NUOVA app con un set di domande diverso

Il modo più rapido è usare la skill **`quiz-interattivo-sorgente`** inclusa in `skills/`. Lo script `clone_quiz_app.py` fa tutto da solo:

1. **Prepara il file JSON delle domande** (modello in `skills/quiz-interattivo-sorgente/templates/questions_example.json`):
   ```json
   {
     "title": "QUESTIONARIO SULL'ANTICA ROMA",
     "report_pdf_filename": "Report_Quiz",
     "blank_pdf_filename": "Questionario",
     "questions": [
       {
         "number": 1,
         "question": "In che anno è stata fondata Roma?",
         "options": ["753 a.C.", "476 a.C.", "27 a.C.", "313 d.C."],
         "correctAnswer": "753 a.C."
       }
     ]
   }
   ```
   Le domande possono essere in **qualsiasi numero** (anche più di 10) e le opzioni in qualsiasi quantità (minimo 2, il PDF usa una griglia dinamica).

2. **Lancia la clonazione** (sorgente locale):
   ```bash
   python skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
     --name quiz-roma-antica \
     --questions /percorso/domande.json \
     --title "Quiz Antica Roma"
   ```

3. **Oppure usa direttamente questa repository GitHub come sorgente** (dopo averla caricata):
   ```bash
   python skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
     --name quiz-roma-antica \
     --questions /percorso/domande.json \
     --title "Quiz Antica Roma" \
     --source https://github.com/IL-TUO-UTENTE/IL-TUO-REPO
   ```
   Lo script clona la repository in locale, la usa come sorgente e produce la nuova app con le domande diverse.

4. Lo script copia il progetto in una cartella nuova, rinomina `package.json` e il titolo del browser, applica le nuove domande (su **tutte** le copie mirror, incluse `server/db.ts` per il limite domande e il voto), verifica i mirror, esegue `pnpm install` e `pnpm check`. Poi si fa il deploy (preview → conferma → produzione).

> ⚠️ **NON modificare mai le domande direttamente nel sorgente** se vuoi mantenerlo come base: usa la skill `quiz-adapter` solo per cambiare le domande **in-place** nell'app esistente.

> ℹ️ **Voto:** il voto finale = numero di risposte corrette (1 pt ciascuna), massimo **N/N** dove N = numero di domande (es. 8 domande → riga grande `PUNTEGGIO: X/8` + riga piccola `Ogni risposta corretta vale 1 punto · Massimo 8/8`). Il riquadro PUNTEGGIO nei PDF si adatta automaticamente.

---

## 🧩 Le skill incluse (cartella `skills/`)

| Skill | Scopo |
|-------|-------|
| `quiz-interattivo-sorgente` | **Clona** l'app in una nuova identica con un set di domande diverso (script `clone_quiz_app.py` + `change_quiz_theme.py` + template JSON). Supporta sorgente locale **o repository GitHub** (`--source`) |
| `quiz-adapter` | Cambia le domande **in-place** nell'app esistente (stesso progetto, senza clonare) |
| `shakespeare-quiz` | Manutenzione completa del sorgente: UI, sessioni, PDF, contatore studenti, deploy, ZIP |

Le skill sono documenti Markdown con istruzioni operative + script Python: sono pensate per essere lette e seguite automaticamente.

---

## 🏗️ Struttura del progetto

```
├── client/                     # Frontend React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── TeacherPage.tsx     # Pannello insegnante
│       │   └── StudentQuiz.tsx     # Interfaccia studente
│       ├── lib/reportPdf.ts        # Generazione PDF (report + questionario + PUNTEGGIO)
│       └── index.css               # Stili globali (inclusa centratura data)
├── server/                     # Backend Express + tRPC
│   ├── questions.ts                # DOMANDE (modificato dagli script skill)
│   ├── routers.ts                  # API + validatori (.min(1).max(N), .min(0).max(N))
│   ├── db.ts                       # Database client e query (limite domande Math.min(..., N))
│   └── _core/                      # Scaffold (auth, trpc, env)
├── deploy/                     # Dockerfile, docker-compose, entrypoint
├── drizzle/                    # Schema database
├── skills/                     # ⭐ LE 3 SKILL (vedi tabella sopra)
├── questions.ts                # ⚠️ MIRROR di server/questions.ts
├── TeacherPage.tsx             # ⚠️ MIRROR di client/src/pages/TeacherPage.tsx
├── StudentQuiz.tsx             # ⚠️ MIRROR di client/src/pages/StudentQuiz.tsx
├── reportPdf.ts                # ⚠️ MIRROR di client/src/lib/reportPdf.ts
├── Dockerfile                  # ✅ Build completo dal sorgente (install + pnpm build + migrazioni all'avvio) — usato da docker-compose
├── deploy/Dockerfile           # ✅ Equivalente al root (per -f deploy/Dockerfile)
├── deploy/Dockerfile.render    # ✅ Dockerfile per Render (multi-stage, build + migrazioni)
├── deploy/docker-entrypoint.sh # Esegue drizzle-kit push poi avvia il server
├── .dockerignore               # Esclude node_modules/.git/dist/.env e guide pesanti
├── render.yaml                 # Config Render Blueprint (usa deploy/Dockerfile.render)
├── GUIDA-SKILL-GITHUB.md       # ⭐ Guida dettagliata: skill + repository GitHub
└── README.md                   # Questo file
```

### ⚠️ File mirror (IMPORTANTE)

Quattro file esistono **in due copie identiche** (radice + client/server). Ogni modifica va fatta su **entrambe**: gli script delle skill lo fanno automaticamente.

| Radice | Copia |
|--------|-------|
| `TeacherPage.tsx` | `client/src/pages/TeacherPage.tsx` |
| `StudentQuiz.tsx` | `client/src/pages/StudentQuiz.tsx` |
| `questions.ts` | `server/questions.ts` |
| `reportPdf.ts` | `client/src/lib/reportPdf.ts` |

Verifica sempre con `diff` dopo modifiche manuali.

---

## 🚀 Deploy su Render (gratuito, ~10 minuti)

Render offre **hosting Docker + database PostgreSQL gratis**, senza carta di credito.

### 1️⃣ Prepara il repository su GitHub

1. Crea un account su [GitHub](https://github.com)
2. **"+"** → **"New repository"** → nome es. `shakespeare-quiz` → **Public** → **Create repository**
3. Carica i file: estrai questo ZIP e trascina tutti i file nell'interfaccia web di GitHub (oppure usa GitHub Desktop / git push)

> ⚠️ **NON caricare il file `.env`** (contiene i segreti): è già escluso dal `.gitignore`, quindi se carichi la cartella estratta non verrà incluso.

### 2️⃣ Collega Render al repository

1. [Render Dashboard](https://dashboard.render.com) → **"New +"** → **"Blueprint"**
2. Connetti l'account GitHub e scegli il repository
3. Render legge `render.yaml` (database PostgreSQL `quiz-db` + web service Docker free)
4. Clicca **"Apply"** e attendi 3-5 minuti finché vedi `✓ Service is live 🎉`

L'app sarà su `https://shakespeare-quiz.onrender.com`

### 3️⃣ Collega al tuo blog Blogger

**Opzione A — Link nel menu:** Blogger → Layout → Aggiungi Gadget → Link List → nome e URL dell'app.

**Opzione B — Cornice dinamica (consigliata, il quiz appare dentro il blog con altezza automatica):**
Nella cartella `cornice-dinamica/` trovi il blocco HTML da incollare nel post (Blogger → vista HTML):
- ⭐ `embed-shakespeare-quiz-dedicata.html` — versione completa (v3 impermeabile + anti-loop): titolo "QUIZ INTERATTIVO", pulsanti Schermo intero/Ricarica, spinner, stato online/errore con Riprova, altezza che si adatta da sola al contenuto e font OpenDyslexic.
- `embed-shakespeare-quiz-lite.html` — versione minima (~5 KB).
- `embed-shakespeare-quiz.html` — versione autosufficiente (font in base64).

Semplice iframe fisso (per un embed minimale):
```html
<iframe src="https://shakespeare-quiz.onrender.com"
  style="width:100%; height:100vh; border:none;"></iframe>
```
Nota: per l'embed consigliato (altezza automatica) NON aggiungere script inline alla pagina dell'app: l'altezza è gestita da `heightSync.ts` (protocollo `labvisivo:height`), come in LATINO-FACILE-APPLICAZIONE.

---

## 📱 Come si usa

### Per l'insegnante
1. Apri l'app, clicca **"APRI UNA NUOVA CLASSE"**
2. Scegli nome, data e password; clicca **CREA CLASSE**
3. **AVVIA SESSIONE** — compare il codice di accesso
4. Gli studenti si collegano da qualsiasi dispositivo
5. Avanza con le domande, premi **"Mostra risposta esatta"** quando vuoi
6. A fine sessione: **REPORT PDF** o **QUIZ IN BIANCO PDF** (OpenDyslexic, UNA pagina per studente) — in fondo c'è il riquadro **PUNTEGGIO** PLUM a 2 righe, mai spezzato

### Per lo studente
1. Apri l'app sul telefono, inserisci nome e codice della classe
2. Rispondi alle domande (tap sul nome studente → tooltip con nome completo anche su mobile)
3. Vedi il punteggio in tempo reale

---

## 🔧 Cambiare le domande IN-PLACE (senza clonare)

Usa la skill **`quiz-adapter`**:

```bash
python skills/quiz-adapter/scripts/change_quiz_theme.py il_tuo_file.json
```

Aggiorna domande, validatori, riferimenti `/N` in UI, `db.ts` (limite + voto) e titoli/nomi dei PDF **in tutte le copie mirror**. Per ripristinare: backup in `.quiz-backups/`.

---

## ⚙️ Deploy alternativi

### Render (manuale, Web Service)
1. **"New +"** → **"Web Service"** → connetti GitHub → Runtime **Docker** → **Free**
2. Variabili d'ambiente: `NODE_ENV=production`, `BETTER_AUTH_SECRET` (genera con `openssl rand -base64 32`)
3. **"New +"** → **"PostgreSQL"** → Free → aggiungi `DATABASE_URL` al web service

### Railway
1. **"New Project"** → **"Deploy from GitHub repo"**
2. Aggiungi `NODE_ENV=production`, `BETTER_AUTH_SECRET`, database PostgreSQL (Railway imposta `DATABASE_URL` da solo)

### Docker Compose (server proprio)
```bash
docker compose -f deploy/docker-compose.yml up -d
```
L'app sarà su `http://localhost:3000`.

---

## 📄 Licenza

MIT — libero di usare, modificare e condividere.
