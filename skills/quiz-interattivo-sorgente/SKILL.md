---
name: quiz-interattivo-sorgente
description: "Clona l'app QUIZ INTERATTIVO SORGENTE (l'app Shakespeare Quiz in /home/user/shakespeare-quiz) in una NUOVA app identica con un set di domande diverso. Usare quando l'utente chiede una nuova app simile/uguale al quiz sorgente cambiando solo le domande (stesso aspetto, barra accessibilità con Font/Interlinea/Righello/Modalità/Ascolto-TTS e OpenDyslexic, codici classe, sessioni, contatore studenti, report PDF in OpenDyslexic sempre su un'unica facciata (box PUNTEGGIO PLUM adattato a N domande, scelte marcate con simboli vettoriali ✔/✘), voto = risposte corrette su N, altezza dinamica per embed e cartella cornice-dinamica/). NON usare per modificare le domande dell'app sorgente stessa (usare quiz-adapter) né per manutenere l'app sorgente (usare shakespeare-quiz)."
---

# Quiz Interattivo Sorgente — Skill di Clonazione

## Overview

Il **QUIZ INTERATTIVO SORGENTE** è l'app full-stack per quiz in classe (docente + studenti in tempo reale, codice classe, report PDF). Vive in `/home/user/shakespeare-quiz` (produzione: `https://shakespeare-quiz.easy-peasy.site`). Stack: Vite + React + TypeScript + Tailwind + tRPC + Drizzle + PostgreSQL (scaffold web-db-user).

Questa skill serve a **generare una copia identica** dell'app in una cartella nuova, cambiando **solo il set di domande** (e opzionalmente il titolo della scheda browser). Tutto il resto — UI, header "QUIZ INTERATTIVO", codici classe, logica sessioni, contatore studenti, PDF, stili (inclusi centratura data e tooltip touch) — rimane **identico al sorgente**.

## Architettura — MIRROR FILE SYSTEM (CRITICO)

Il sorgente ha **quattro coppie di file mirror** che devono restare **sempre identici**. Ogni modifica va fatta su ENTRAMBE le copie:

| Ruolo | Copia radice | Copia client/server |
|-------|-------------|---------------------|
| UI docente | `TeacherPage.tsx` | `client/src/pages/TeacherPage.tsx` |
| UI studente | `StudentQuiz.tsx` | `client/src/pages/StudentQuiz.tsx` |
| Domande | `questions.ts` | `server/questions.ts` |
| Report PDF | `reportPdf.ts` | `client/src/lib/reportPdf.ts` |

Verifica sempre con `diff` dopo ogni clonazione o modifica. Lo script di clonazione aggiorna **entrambe** le copie automaticamente.

## Flusso di clonazione (in 3 passi)

### Passo 1 — Prepara il JSON delle domande

Usa come modello: `/home/user/skills/quiz-interattivo-sorgente/templates/questions_example.json`

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

- `title` (obbligatorio): intestazione stampata sui PDF.
- `questions` (obbligatorio): numero di domande **qualsiasi**, opzioni **da 2 in su**.
- `report_pdf_filename` / `blank_pdf_filename` (opzionali): prefissi dei file PDF.
- **Voto finale = numero di risposte corrette (1 pt ciascuna), massimo N/N** dove N = numero di domande. Il riquadro PUNTEGGIO nei PDF (layout v2) si adatta automaticamente (es. 8 domande → riga grande `PUNTEGGIO: X/8` + riga piccola `Ogni risposta corretta vale 1 punto · Massimo 8/8`).

### Passo 2 — Lancia lo script di clonazione

```bash
python /home/user/skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
  --name quiz-roma-antica \
  --questions /percorso/domande.json \
  --title "Quiz Antica Roma"
```

Lo script:
1. Copia il progetto in `/home/user/quiz-roma-antica` (esclude `node_modules`, `.git`, `dist`, `.quiz-backups`, zip e le guide `GUIDA-*.html`).
2. Rinomina `package.json` (name) e il `<title>` di `client/index.html`.
3. Inizializza git e crea il primo commit (necessario per i checkpoint webdev).
4. Lancia `change_quiz_theme.py` sulla **copia** (non sul sorgente): domande, validatori `.min(1).max(N)` e `.min(0).max(N)` (score), limite domande in `db.ts`, riferimenti `/N` in TeacherPage/StudentQuiz, titoli e griglia opzioni dinamica nei PDF — **su tutte le copie mirror**.
5. Esegue `pnpm install` e `pnpm check` e verifica che le coppie mirror siano identiche.

Flag utili: `--force` (sovrascrivi), `--no-install` (salta install/check), `--source` (sorgente diverso), `--adapter` (percorso change_quiz_theme.py alternativo).

**Usare la repository GitHub come sorgente** — se l'utente ha caricato il pacchetto su GitHub, basta passare l'URL della repository: lo script la clona da solo in `/home/user/_repo_<nome>` e ci lavora sopra (così la nuova app nasce direttamente dalla versione pubblicata):

```bash
python /home/user/skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
  --name quiz-roma-antica \
  --questions /percorso/domande.json \
  --title "Quiz Antica Roma" \
  --source https://github.com/andreakeating1982/shakespeare-quiz
```

**Nota sulla versione da GitHub:** il pacchetto ZIP che l'utente carica su GitHub contiene anche la cartella `skills/` con queste stesse skill: se la repository è aggiornata, il flusso è identico a quello locale.

### Passo 3 — Verifica e deploy

1. **Verifica mirror** (lo script lo fa già, ma ricontrolla):
   ```bash
   diff /home/user/quiz-roma-antica/TeacherPage.tsx /home/user/quiz-roma-antica/client/src/pages/TeacherPage.tsx
   diff /home/user/quiz-roma-antica/StudentQuiz.tsx /home/user/quiz-roma-antica/client/src/pages/StudentQuiz.tsx
   diff /home/user/quiz-roma-antica/questions.ts /home/user/quiz-roma-antica/server/questions.ts
   diff /home/user/quiz-roma-antica/reportPdf.ts /home/user/quiz-roma-antica/client/src/lib/reportPdf.ts
   ```
2. **pnpm check** nella nuova cartella (fatto dallo script; se fallisce, correggi prima di proseguire).
3. **Deploy PREVIEW** (`webdev_deploy` mode=preview, project_dir = nuova cartella) e **test visivo**: apri una classe come docente, entra con uno studente, verifica che domande/opzioni/PDF mostrino il nuovo tema e che l'app sia identica al sorgente nel resto.
4. **Checkpoint** (`webdev_save_checkpoint`) e chiedi **conferma esplicita** all'utente.
5. **Deploy PRODUZIONE** (`webdev_deploy` mode=production) solo dopo la conferma.

## Cosa cambia vs cosa resta identico

**Cambia:** array domande, validatori `.max(N)` (questionNumber e score), limite domande in `db.ts` (`Math.min(..., N)`), riferimenti `/N` in UI (es. "DOMANDA X/5", "X/5 risposte corrette"), titoli e nomi file dei PDF, `package.json` name, `<title>` del browser.

**Resta identico:** header "QUIZ INTERATTIVO", layout docente/studente, codici classe e password, logica sessioni e contatore studenti, report PDF (layout v2 2026-09-04: OpenDyslexic ≥ 14 pt interlinea 1.5, UNA pagina per studente, box PUNTEGGIO PLUM con `Q_TOTAL` dinamico, scelte marcate con simboli vettoriali ✔/✘ subito dopo la lettera — dettagli completi nella skill shakespeare-quiz, sezioni 5 e 24), stili CSS (inclusa la centratura del campo data in "APRI UNA NUOVA CLASSE" e il tooltip touch sul nome studente).

**Ereditate automaticamente dal sorgente (dal 2026-09-03, NON rimuovere):** la clonazione copia l'INTERO progetto, quindi la nuova app nasce GIÀ con:
- **Barra accessibilità** (`client/src/components/AccessibilityToolbar.tsx` + `contexts/AccessibilityContext.tsx` + `hooks/useReadAloud.ts`): 5 moduli FONT (A−/A+ 0.8–1.6), INTERLINEA (1.5→2.6), RIGHELLO, MODALITÀ (alto contrasto `lf-hc`), ASCOLTO (TTS italiano). Persistenza `sq_access` in localStorage. **NIENTE MIRROR: esistono solo in `client/src/`.**
- **Font OpenDyslexic** in `client/public/fonts/` (serviti su `/fonts` con CORS dal server).
- **Altezza dinamica embed**: `client/src/lib/heightSync.ts` (protocollo `labvisivo:height`, inizializzato in `main.tsx`) + margini prima pagina pareggiati (`lf-welcome`, 24px sopra/sotto) + niente script legacy inline in `client/index.html`.
- **Cartella `cornice-dinamica/`** a root con gli embed per Blogger (dedicata/lite/universale/autosufficiente/test/fonts/README).

⚠️ **Se la nuova app deve avere un embed dedicato per il SUO blog**, aggiornare `APP_URL` dentro `cornice-dinamica/embed-*-dedicata.html` (e lite/universale) all'URL di produzione della NUOVA app, e nel caso adattare palette/titolo (vedi skill shakespeare-quiz sez. 19). Il clone NON tocca queste funzionalità: restano attive e funzionanti senza interventi.

**Voto:** il voto mostrato nel report (riga info "Voto: X/N") e nel riquadro PUNTEGGIO (riga grande `PUNTEGGIO: X/N` + riga piccola `Ogni risposta corretta vale 1 punto · Massimo N/N`) = risposte corrette su N. `db.ts` calcola `grade = correctCount` (NON più su base 10).

## Pacchetto GitHub e sincronizzazione

Il progetto sorgente include una cartella `skills/` interna con **copie identiche** delle 3 skill (quiz-interattivo-sorgente, quiz-adapter, shakespeare-quiz): quando l'utente esporta lo ZIP per GitHub, le skill viaggiano insieme al codice. Se una skill viene aggiornata in `/home/user/skills/`, sincronizzare anche la copia interna del progetto (`/home/user/shakespeare-quiz/skills/`) così la repository pubblicata resta allineata.

## File aggiornati dall'adapter (change_quiz_theme.py)

1. `questions.ts` + `server/questions.ts` (array domande)
2. `server/routers.ts` (validatori `.max(N)` per questionNumber e score)
3. `server/db.ts` (limite `Math.min(..., N)` in nextQuestion; `grade = correctCount`)
4. `TeacherPage.tsx` + `client/src/pages/TeacherPage.tsx` (`/N`, `>= N`, `correctAnswers + '/N'`)
5. `StudentQuiz.tsx` + `client/src/pages/StudentQuiz.tsx` (`DOMANDA X/N`, barra progresso)
6. `reportPdf.ts` + `client/src/lib/reportPdf.ts` (titolo PDF con `TOP + 1`, nomi file, griglia opzioni DINAMICA per supportare qualsiasi numero di opzioni ≥ 2)

**Riquadro PUNTEGGIO (report + quiz in bianco):** NON va toccato dall'adapter — usa `Q_TOTAL`/`data.questions.length` dinamici, quindi si adatta da solo al numero di domande (layout v2: 2 righe `PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`, bordo PLUM).

## Backup e rollback

`change_quiz_theme.py` salva i backup in `<progetto>/.quiz-backups/` prima di ogni modifica. Per ripristinare: copia il `.bak.<timestamp>` sul file originale e rilancia `pnpm check`. La clonazione NON tocca mai il sorgente (`/home/user/shakespeare-quiz`).

## Pitfall noti

- **Mirror fuori sync**: se qualcuno modifica solo una copia, la clonazione copia lo stato incoerente. Prima di clonare verifica che il sorgente abbia i mirror identici.
- **`--name`**: solo minuscole/numeri/trattini (es. `quiz-roma-antica`). Il nome diventa anche la cartella in `/home/user/`.
- **Stringhe sostituite testualmente**: se il codice del sorgente cambia formato (es. "Domanda X/10" → altro), lo script avvisa con ⚠️ ma non abortisce: controlla sempre l'output e `pnpm check`.
- **Deploy**: mai in produzione nella stessa risposta in cui hai scritto codice o creato la preview — prima checkpoint, poi conferma esplicita dell'utente.
- **Database condiviso**: il sorgente usa PostgreSQL Neon e il `.env` viene copiato nella clonazione → la nuova app punta allo **STESSO database** del sorgente (classi/sessioni condivise). Se l'utente vuole dati separati, aggiornare `DATABASE_URL` nel `.env` della copia prima del deploy produzione.
- **Riquadro PUNTEGGIO (layout v2)**: NON modificarlo durante la clonazione — usa `Q_TOTAL`/`data.questions.length` dinamici e si adatta da solo (v2: 2 righe `PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`, box PLUM con `boxW = Math.min(CW, max(wBig, wSmall) + 10)`). **NIENTE più sezione riassunto CORRETTE/INCORRETTE** (rimossa nel v2 del 2026-09-04) né funzioni `blockH`/`computeQuestionHeight` (eliminate dal codice): la garanzia "sempre 1 pagina per studente" è il preflight reale `pickFactor`. Riferirsi alla skill shakespeare-quiz, sezione 5.
- **Non clonare dentro il sorgente**: la destinazione è sempre `/home/user/<nome>`.
- **File di accessibilità senza mirror**: `AccessibilityToolbar.tsx`, `AccessibilityContext.tsx`, `useReadAloud.ts`, `heightSync.ts` vivono SOLO in `client/src/` — mai duplicarli a root (a differenza di TeacherPage/StudentQuiz/questions/reportPdf).
- **`change_quiz_theme.py` NON tocca l'accessibilità**: domande/PDF/UI cambiano, ma barra accessibilità, TTS, OpenDyslexic, heightSync e cornice dinamica restano intatti (verificare con `pnpm check` dopo la clonazione).
- **Cornice dinamica nel clone**: la cartella `cornice-dinamica/` viene copiata con gli embed che puntano all'URL del SORGENTE. Se l'utente embedda la NUOVA app, cambiare `APP_URL` negli embed (e nel caso titolo/colori) prima di consegnarli.
