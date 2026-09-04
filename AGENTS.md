# 🤖 AGENTS — Istruzioni operative per agenti IA

Questo file è pensato per **agenti IA** (Marky/Easy-Peasy AI o altri coding agent) che lavorano su
questa repository. Leggere PRIMA di modificare qualsiasi cosa.

---

## 1. Regole d'oro

1. **Mai modificare le domande a mano nel sorgente** per creare una variante → usare la skill
   `quiz-interattivo-sorgente` (clone) o `quiz-adapter` (in-place). Il sorgente è la **base**.
2. **File mirror**: 4 coppie devono restare **sempre identiche** (radice ⇄ client/server):
   `questions.ts` ⇄ `server/questions.ts`, `TeacherPage.tsx` ⇄ `client/src/pages/TeacherPage.tsx`,
   `StudentQuiz.tsx` ⇄ `client/src/pages/StudentQuiz.tsx`,
   `reportPdf.ts` ⇄ `client/src/lib/reportPdf.ts`. Ogni modifica va fatta su ENTRAMBE.
3. **Database = PostgreSQL**, non SQLite. `DATABASE_URL` obbligatorio per db/migrazioni.
4. **File di accessibilità SENZA mirror**: `AccessibilityContext.tsx`, `AccessibilityToolbar.tsx`,
   `useReadAloud.ts`, `heightSync.ts` esistono **solo** in `client/src/` — non duplicarli a root.
5. **Prima di ogni consegna**: `pnpm check` pulito e `diff` sui 4 mirror senza output.
6. **Deploy**: prima preview, poi chiedere conferma all'utente, poi produzione. Mai produzione
   nella stessa risposta in cui si scrive codice o si crea la preview.

---

## 2. Comandi rapidi

| Azione | Comando |
|---|---|
| Installare | `pnpm install` |
| Dev server | `pnpm dev` (porta 3000) |
| TypeScript check | `pnpm check` |
| Test | `pnpm test` |
| Migrazioni DB | `pnpm db:push` (generate + migrate) |
| Build produzione | `pnpm build` (client in `dist/public`, server in `dist/index.js`) |
| Avvio produzione | `pnpm start` |
| Verifica mirror | `diff questions.ts server/questions.ts` (x4) |

---

## 3. Dove vive ogni cosa

- **Domande**: `questions.ts` + `server/questions.ts` (costante `SHAKESPEARE_QUESTIONS`).
- **API**: `server/routers.ts` (+ `routers.ts` a root per i mirror di vecchia UI):
  `questions.list` (senza risposte), `questions.check`, `answers.submit` (confronto
  `q.correctAnswer === selectedAnswer`), `answers.getMyAnswers`, report/statistiche.
- **UI studente**: `client/src/pages/StudentQuiz.tsx` — rendering opzioni MC, `handleSelectAnswer`,
  auto-salvataggio, re-entry da DB.
- **UI docente**: `client/src/pages/TeacherPage.tsx` — classi, sessione, punteggi live, PDF.
- **PDF**: `client/src/lib/reportPdf.ts` — layout v2 (OpenDyslexic ≥ 14 pt, interlinea 1.5, UNA
  facciata per studente): opzioni in linea con la scelta marcata dai **simboli vettoriali ✔ (verde
  scuro) / ✘ (rossa)** subito dopo la lettera (opzione esatta non scelta in verde), box PUNTEGGIO
  PLUM 2 righe (`PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`) **mai
  spezzato** (preflight reale `pickFactor`). NIENTE sezione CORRETTE/INCORRETTE né scritta
  "RISPOSTA DELLO STUDENTE".
- **DB**: `server/db.ts` — Postgres via Drizzle; `getReportData()` calcola punteggi e risposte.
- **Prima pagina**: `client/src/pages/Home.tsx` + classi CSS `lf-welcome`, `lf-welcome-top`,
  `lf-embedded` (margini pareggiati, altezza dinamica embed).
- **Altezza embed**: `client/src/lib/heightSync.ts` (protocollo `labvisivo:height`, attivo solo in
  iframe, token `?cornice=`, anti-loop lato cornice).
- **Cornice per Blogger**: `cornice-dinamica/` (embed HTML + fonts + test). La versione consigliata
  è `embed-shakespeare-quiz-dedicata.html` (v3 impermeabile + anti-loop). Se la si modifica, il
  titolo/colori/URL devono restare allineati a quest'app.
- **Barra accessibilità**: vedi `ACCESSIBILITA.md`.

---

## 4. Flusso per creare una NUOVA app (variante)

1. Leggi `ADATTARE.md` (tipologie di domande) e la skill `skills/quiz-interattivo-sorgente/SKILL.md`.
2. Prepara il file JSON delle domande (modello:
   `skills/quiz-interattivo-sorgente/templates/questions_example.json`).
3. Clona:
   ```bash
   python skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
     --name nome-nuova-app --questions /percorso/domande.json --title "Titolo" \
     [--source https://github.com/...]   # per clonare da questa repo GitHub
   ```
4. Verifica: `pnpm check` + diff mirror nella nuova app.
5. Deploy preview → conferma utente → produzione.

## 5. Flusso per cambiare le domande IN-PLACE (stessa app)

```bash
python skills/quiz-adapter/scripts/change_quiz_theme.py /percorso/domande.json [--project /path]
```

Backup automatici in `.quiz-backups/`.

---

## 6. Deploy

- **Easy-Peasy AI**: preview con `webdev_deploy mode=preview`, produzione con `mode=production`
  (solo dopo OK esplicito dell'utente).
- **Render** (hosting esterno): segui `RENDER.md`. Il Blueprint `render.yaml` crea PostgreSQL +
  Web Service Docker usando **`deploy/Dockerfile.render`** (multi-stage).

⚠️ **ATTENZIONE Dockerfile:** ci sono 3 Dockerfile, TUTTI con build dal sorgente (`pnpm build`
dentro il container) + migrazioni all'avvio via `deploy/docker-entrypoint.sh`:
- `Dockerfile` (root) — usato da `docker-compose.yml` (`build: .`) e deploy generici;
- `deploy/Dockerfile` — equivalente, per chi usa `-f deploy/Dockerfile`;
- `deploy/Dockerfile.render` — multi-stage per Render (referenziato da `render.yaml`).
Se il deploy fallisce con "container failed to start" verifica che `DATABASE_URL` sia iniettato e
che il container abbia eseguito `drizzle-kit push` (log all'avvio).

---

## 7. Cosa NON fare

- ❌ Non modificare solo una copia di un file mirror.
- ❌ Non usare SQLite/`better-sqlite3`: il codice è Postgres.
- ❌ Non rimuovere/rinominare i file di accessibilità né la cartella `cornice-dinamica/`.
- ❌ Non commitare `.env` (è in `.gitignore`).
- ❌ Non cambiare le domande del SORGENTE per un nuovo tema: clona.
