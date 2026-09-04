# 🧩 GUIDA DETTAGLIATA — Skill di clonazione + Repository GitHub

Questa guida spiega come usare il pacchetto **QUIZ INTERATTIVO SORGENTE** per generare nuove app identiche con un set di domande diverso, sia da cartella locale sia **direttamente dalla repository GitHub** che carichi tu.

---

## 1. Cosa contiene questo pacchetto

| Elemento | Descrizione |
|----------|-------------|
| **Codice sorgente completo** | L'app QUIZ INTERATTIVO SORGENTE (Vite + React + TS + Tailwind + tRPC + Drizzle + PostgreSQL + jsPDF), pronta per GitHub/Render |
| **`skills/quiz-interattivo-sorgente/`** | Skill di **clonazione**: crea una NUOVA app identica cambiando solo le domande (script `clone_quiz_app.py` + `change_quiz_theme.py` + template JSON) |
| **`skills/quiz-adapter/`** | Skill di **modifica in-place**: cambia le domande nell'app esistente senza clonare |
| **`skills/shakespeare-quiz/`** | Skill di **manutenzione** del sorgente (UI, sessioni, PDF, deploy, ZIP) |
| **`GUIDA-SKILL-GITHUB.md`** | Questo file |
| **`README.md`** | Panoramica del progetto, deploy Render, uso docente/studente |

> Le skill sono documenti Markdown con istruzioni operative + script Python. Sono pensate per essere **lette e seguite automaticamente** da Marky: quando gli chiedi una nuova app, lui consulta la skill e la esegue.

---

## 2. Caricare il progetto su GitHub (una volta sola)

Questo passaggio serve per avere la "sorgente ufficiale" su GitHub, così Marky può generare nuove app anche quando il progetto non è presente localmente nella sua sandbox.

### 2.1 Con GitHub Desktop (consigliato per chi non usa git da terminale)

1. Installa [GitHub Desktop](https://desktop.github.com/) e accedi con il tuo account.
2. **File → New repository…** → Nome es. `shakespeare-quiz` → **Public** → **Create repository**.
3. Apri la cartella del repository (`C:\...\shakespeare-quiz`), estrai dentro **tutti i file di questo pacchetto ZIP** (attenzione: estrai il *contenuto*, non la cartella zip stessa).
4. GitHub Desktop mostrerà i file come modifiche: scrivi un messaggio (es. "Versione sorgente") e clicca **Commit to main**.
5. Clicca **Publish repository** → **Publish**. Fatto: la repo è su GitHub.
6. Copia l'URL della repo (es. `https://github.com/il-tuo-utente/shakespeare-quiz`): servirà al passo 3.

### 2.2 Con git da terminale

```bash
cd /percorso/del/pacchetto-estratto
git init
git add .
git commit -m "QUIZ INTERATTIVO SORGENTE"
# crea prima la repo vuota su github.com (Public), poi:
git remote add origin https://github.com/il-tuo-utente/shakespeare-quiz.git
git branch -M main
git push -u origin main
```

### 2.3 Cosa NON caricare

- **`.env`** — contiene i segreti (è già nel `.gitignore`, quindi se carichi la cartella estratta **non** verrà incluso automaticamente).
- `node_modules/`, `dist/`, `*.zip`, `.quiz-backups/` — già esclusi.

Dopo il push, verifica su github.com che i file siano presenti (in particolare `skills/` e `package.json`).

---

## 3. Chiedere a Marky una nuova app con domande diverse

### 3.1 Il modo più semplice (consigliato)

Scrivi a Marky un messaggio come questo:

> "Crea una nuova app come il QUIZ INTERATTIVO SORGENTE, con queste domande: [incolla le domande in testo libero]."

Marky:
1. Legge la skill `quiz-interattivo-sorgente` (registrata nei suoi Skill);
2. Prepara il file JSON delle domande dal tuo testo;
3. Lancia `clone_quiz_app.py` (con sorgente locale **o** con `--source` = URL della tua repo GitHub);
4. Verifica mirror e `pnpm check`;
5. Deploy preview → tua conferma → produzione.

### 3.2 Usare esplicitamente la repository GitHub

Se vuoi che Marky parta **dalla tua repository GitHub** (ad esempio perché la sandbox è nuova e il progetto locale non c'è), digli:

> "Crea una nuova app come il QUIZ INTERATTIVO SORGENTE usando la repository https://github.com/il-tuo-utente/shakespeare-quiz, con il set di domande [descrivi o allega il file]."

Marky userà:

```bash
python /home/user/skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
  --name quiz-roma-antica \
  --questions /percorso/domande.json \
  --title "Quiz Antica Roma" \
  --source https://github.com/il-tuo-utente/shakespeare-quiz
```

Lo script clona la repo in locale (`/home/user/_repo_<nome>`), la usa come sorgente e produce la nuova app.

### 3.3 Formato del file JSON delle domande

Marky può generarlo da solo dal tuo testo, ma se preferisci prepararlo tu, il modello è `skills/quiz-interattivo-sorgente/templates/questions_example.json`:

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

Regole:
- **`number`**: progressivo da 1.
- **`options`**: minimo 2, nessun massimo (il PDF usa una griglia dinamica).
- **`correctAnswer`**: deve coincidere con una delle opzioni.
- **Numero di domande**: libero (anche più di 10). Il voto finale = risposte corrette, massimo **N/N** (es. 12 domande → riga grande `PUNTEGGIO: X/12` + riga piccola `Ogni risposta corretta vale 1 punto · Massimo 12/12`); il riquadro PUNTEGGIO (PLUM, 2 righe) nei PDF si adatta da solo e resta sempre su UNA facciata.
- **`title`** (opzionale): titolo che appare in testa ai PDF.
- **`report_pdf_filename` / `blank_pdf_filename`** (opzionali): prefissi dei nomi dei file PDF scaricati.

---

## 4. Cosa succede durante la clonazione (sotto il cofano)

`clone_quiz_app.py` esegue:

1. **Copia** il progetto sorgente (locale o repo GitHub) escludendo `node_modules`, `.git`, `dist`, `.quiz-backups`, `*.zip`, guide HTML.
2. **Rinomina** `package.json` (name) e il `<title>` del browser.
3. **Git init** + primo commit (necessario per i checkpoint webdev).
4. **`change_quiz_theme.py`** sulla copia, che aggiorna:
   - `questions.ts` + `server/questions.ts` (le domande);
   - `server/routers.ts` (validatori `.max(N)` per questionNumber e score);
   - `server/db.ts` (limite `Math.min(..., N)` in nextQuestion; `grade = correctCount`);
   - `TeacherPage.tsx` + mirror (`/N`, `>= N`, `correctAnswers + '/N'`);
   - `StudentQuiz.tsx` + mirror (`DOMANDA X/N`, barra progresso);
   - `reportPdf.ts` + mirror (titolo PDF, nomi file, griglia opzioni dinamica).
5. **`pnpm install`** e **`pnpm check`**.
6. **Verifica mirror** automatica (le 4 coppie devono essere identiche).

> Il riquadro PUNTEGGIO (report + quiz in bianco) NON viene toccato: usa `Q_TOTAL`/`data.questions.length` dinamici, quindi si adatta da solo a qualunque numero di domande (layout v2: 2 righe `PUNTEGGIO: X/N` + `Ogni risposta corretta vale 1 punto · Massimo N/N`, box PLUM). **Resta sempre su un'unica facciata** (garanzia: preflight reale `pickFactor` che disegna la pagina di prova) e nel report la scelta è marcata con i **simboli vettoriali ✔ verde scuro / ✘ rossa subito dopo la lettera** (opzione esatta non scelta in verde). NIENTE sezione riassunto CORRETTE/INCORRETTE né scritta "RISPOSTA DELLO STUDENTE" (rimossi nel v2 2026-09-04): la scelta è marcata sul posto. → Riferimenti: `skills/shakespeare-quiz/SKILL.md` sezioni 5 e 24.

---

## 5. Deploy della nuova app

Dopo la clonazione, la nuova app va messa online:

1. **Preview**: Marky lancia `webdev_deploy` (mode=preview) e ti dà l'URL di prova.
2. **Test**: apri una classe, entra come studente, verifica domande e PDF (riquadro PUNTEGGIO).
3. **Produzione**: dopo la tua conferma esplicita, Marky salva il checkpoint e lancia il deploy produzione (URL permanente `*.easy-peasy.site`).

> Per un deploy su **Render** (hosting proprio): ripeti la sezione 2 con la NUOVA app e segui il `README.md` → "Deploy su Render".

---

## 6. Domande frequenti

**Devo ricaricare la repo su GitHub a ogni nuova app?**
No. La repo del SORGENTE basta caricarla una volta. Ogni nuova app generata è un progetto separato; se vuoi anche quella su GitHub, ripeti la sezione 2 con la cartella della nuova app.

**Il `.env` va caricato su GitHub?**
No, mai: contiene i segreti del database. È già escluso dal `.gitignore`.

**Posso cambiare le domande anche senza clonare?**
Sì, con la skill `quiz-adapter` (modifica in-place, con backup automatici in `.quiz-backups/`).

**Quante domande posso mettere?**
Qualsiasi numero. L'app, i PDF e il voto (risposte corrette su N) si adattano automaticamente.

**Cosa succede se la clonazione fallisce?**
Marky controlla il log: se `pnpm check` dà errori o i mirror non sono identici, corregge e rilancia. Gli script creano backup prima di ogni modifica.

---

## 7. Riferimenti rapidi

| Comando | Scopo |
|---------|-------|
| `python skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py --name <nome> --questions <file.json> --title "<Titolo>"` | Clona da sorgente locale |
| `... --source https://github.com/<utente>/<repo>` | Clona dalla tua repository GitHub |
| `python skills/quiz-adapter/scripts/change_quiz_theme.py <file.json>` | Cambia domande in-place |
| `diff TeacherPage.tsx client/src/pages/TeacherPage.tsx` | Verifica mirror |

---

*Pacchetto QUIZ INTERATTIVO SORGENTE — aggiornato con le skill di clonazione v2 (supporto GitHub, voto N/N, griglia dinamica, riquadro PUNTEGGIO).*
