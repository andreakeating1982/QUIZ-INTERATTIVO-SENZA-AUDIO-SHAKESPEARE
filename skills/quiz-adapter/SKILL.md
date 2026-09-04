---
name: quiz-adapter
description: "Adatta le domande dell'app QUIZ INTERATTIVO (Shakespeare Quiz) a nuovi set di domande. Usa quando l'utente richiede di cambiare le domande, il numero di domande, i titoli/PDF, o il tema del quiz NELL'APP ESISTENTE (modifica in-place). Il report PDF resta sempre su un'unica facciata per studente (layout v2: OpenDyslexic, box PUNTEGGIO PLUM adattato a N domande, nessuna sezione riassunto). Comprende uno script Python che modifica automaticamente tutti i file coinvolti, incluse le copie mirror. Per creare una NUOVA app identica con domande diverse NON usare questa skill: usare quiz-interattivo-sorgente."
---

# Quiz Adapter Skill

## Overview

L'app Shakespeare Quiz (`/home/user/shakespeare-quiz`) ha domande, titoli PDF e riferimenti a `/10` hardcodati in più file. Questa skill fornisce uno script che **automatizza tutte le sostituzioni** a partire da un file JSON.

⚠️ **Importante:** lo script aggiorna **ENTRAMBE le copie mirror** di ogni file (radice + client/server). Le coppie mirror devono sempre restare identiche.

> **Per creare una NUOVA app** (copia identica con un set di domande diverso, senza toccare il sorgente) usa la skill **`quiz-interattivo-sorgente`** (`clone_quiz_app.py`), non questa.

## Files modificati dallo script (entrambe le copie dove presenti)

| Ruolo | Copie aggiornate |
|-------|-----------------|
| Domande | `server/questions.ts` + `questions.ts` (radice) |
| Validatori | `server/routers.ts` |
| UI docente | `client/src/pages/TeacherPage.tsx` + `TeacherPage.tsx` (radice) |
| UI studente | `client/src/pages/StudentQuiz.tsx` + `StudentQuiz.tsx` (radice) |
| Report PDF | `client/src/lib/reportPdf.ts` + `reportPdf.ts` (radice) |

## Utilizzo

### 1. Prepara un file JSON

Usa `/home/user/skills/quiz-adapter/templates/questions_example.json` come modello.

Campi obbligatori:
- `title` — intestazione stampata sui PDF (es. "QUESTIONARIO SULL'ENERGIA SOLARE")
- `questions` — array di oggetti con `number`, `question`, `options`, `correctAnswer`

Campi opzionali:
- `report_pdf_filename` — prefisso per il report studenti (default `Report_Quiz`)
- `blank_pdf_filename` — prefisso per il questionario bianco (default `Questionario`)

### 2. Esegui lo script

```bash
python /home/user/skills/quiz-adapter/scripts/change_quiz_theme.py /percorso/del/tuo/questions.json
```

Per applicare le domande a un progetto diverso dal sorgente (es. un clone):

```bash
python /home/user/skills/quiz-adapter/scripts/change_quiz_theme.py /percorso/questions.json --project /home/user/quiz-roma-antica
```

Lo script:
- Crea backup automatici in `<progetto>/.quiz-backups/`
- Sostituisce le domande, aggiorna i validatori `.min(1).max(N)` e `.min(0).max(N)` (score), corregge `/10` e `>=10` in UI (entrambe le copie mirror)
- Aggiorna `server/db.ts`: limite domande `Math.min(..., N)` e voto `grade = correctCount` (voto = risposte corrette, massimo N/N)
- Trasforma la griglia 2×2 delle opzioni nei PDF in un layout dinamico (supporta qualsiasi numero di opzioni)
- Avvisa con ⚠️ se una sostituzione testuale non trova corrispondenza (stringhe già modificate o codice cambiato)

### 3. Verifica e deploy

```bash
cd /home/user/shakespeare-quiz
pnpm check    # controllo errori TypeScript
pnpm build    # build produzione
```

Poi: mirror identici → deploy preview → checkpoint → conferma utente → deploy produzione (via webdev tools).

## Cosa NON tocca lo script

- Il riquadro PUNTEGGIO nei PDF (report + quiz in bianco) — layout v2 (2026-09-04): usa `Q_TOTAL`/`data.questions.length` dinamici (2 righe `PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`, box PLUM con `boxW = Math.min(CW, max(wBig, wSmall) + 10)`). **Niente sezione riassunto CORRETTE/INCORRETTE** (rimossa nel v2) né funzioni `blockH`/`computeQuestionHeight` (eliminate). La garanzia "sempre 1 pagina" è il preflight reale `pickFactor`; la logica dei simboli vettoriali ✔/✘ NON va toccata. Riferirsi alla skill shakespeare-quiz, sezione 5.
- Il resto della UI (layout, header, codici classe, sessioni, contatore studenti, stili CSS) — resta identico al sorgente.
- **La barra di accessibilità e i file di inclusività** — `AccessibilityToolbar.tsx`, `AccessibilityContext.tsx`, `useReadAloud.ts`, `heightSync.ts` (tutti in `client/src/`, SENZA mirror a root), i font OpenDyslexic in `client/public/fonts/` e la cartella `cornice-dinamica/` NON vengono toccati dallo script (dal 2026-09-03). Restano attivi: 5 moduli FONT/INTERLINEA/RIGHELLO/MODALITÀ/ASCOLTO, TTS italiano, altezza dinamica embed `labvisivo:height`.
- Eventuali traduzioni o adattamenti della UI in altre lingue.

**Voto:** il voto mostrato nel report e nel riquadro PUNTEGGIO = numero di risposte corrette (1 pt ciascuna), massimo N/N — NON più su base 10. `db.ts` calcola `grade = correctCount`.

## Rollback

I backup sono salvati in `.quiz-backups/`. Per ripristinare:

```bash
cp /home/user/shakespeare-quiz/.quiz-backups/<file>.bak.<timestamp> /home/user/shakespeare-quiz/server/questions.ts
```

Ripeti per ogni file modificato, poi esegui `pnpm check`.

## Limitazioni note

- Lo script usa `re.sub` per sostituire `.min(1).max(N)` — funziona solo se la sintassi esatta è invariata.
- Le sostituzioni in TeacherPage/StudentQuiz sono testuali; se il codice cambiasse formato, lo script stampa ⚠️ ma non abortisce — verificare sempre con `pnpm check` e il `diff` dei mirror.
