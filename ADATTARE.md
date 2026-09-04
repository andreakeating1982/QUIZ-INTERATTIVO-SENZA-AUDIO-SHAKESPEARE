# 🧬 ADATTARE — Creare VARIANTI dell'app cambiando SOLO il set di domande

> **A chi serve:** a un agente IA che deve generare una **nuova app identica** a QUIZ INTERATTIVO
> SORGENTE cambiando **solo il set di domande**: contenuto diverso, **numero di domande diverso** e
> **tipologia di domande diversa** (VERO/FALSO, risposta multipla a 3-4 opzioni, fill-in-the-blanks,
> abbinamento immagine-parola, riordino della parola, risposta breve di una parola).
>
> **Regola:** NON modificare mai il sorgente `/home/user/shakespeare-quiz` per creare una variante:
> si **clona** (skill `quiz-interattivo-sorgente`) e si applica il nuovo set di domande sulla copia.
> Per modifiche in-place nell'app esistente si usa la skill `quiz-adapter`.

---

## 1. Il modello dati delle domande (stato attuale: risposta multipla)

Le domande vivono nella costante `SHAKESPEARE_QUESTIONS` in **due copie identiche**:
`questions.ts` (radice) e `server/questions.ts`. Formato attuale:

```ts
export const SHAKESPEARE_QUESTIONS = [
  {
    number: 1,
    question: "Where was William Shakespeare born?",
    options: ["Stratford-upon-Avon", "London", "Paris", "Verona"],
    correctAnswer: "Stratford-upon-Avon",
  },
  // ...
];
```

| Campo | Tipo | Note |
|---|---|---|
| `number` | number | Progressivo 1..N |
| `question` | string | Testo della domanda |
| `options` | string[] | **≥ 2 opzioni** (il PDF usa una griglia dinamica: qualsiasi numero, anche 5-6) |
| `correctAnswer` | string | Deve corrispondere ESATTAMENTE a una delle `options` |

**File che dipendono da questo formato** (tutti da aggiornare quando si cambia la *tipologia*):

| File | Ruolo |
|---|---|
| `questions.ts` + `server/questions.ts` | Definizione domande |
| `routers.ts` + `server/routers.ts` | API: `questions.list` (senza risposte), `questions.check`, `answers.submit` → confronto `q.correctAnswer === selectedAnswer` |
| `server/db.ts` | `getReportData()`: rilegge `SHAKESPEARE_QUESTIONS`, confronta risposte |
| `StudentQuiz.tsx` + `client/src/pages/StudentQuiz.tsx` | UI studente: rende `options` come bottoni, invia `selectedAnswer` |
| `TeacherPage.tsx` + `client/src/pages/TeacherPage.tsx` | UI docente: mostra la risposta data e quella corretta |
| `reportPdf.ts` + `client/src/lib/reportPdf.ts` | PDF (layout v2): opzioni in linea A/B/C… con la scelta marcata dai **simboli vettoriali ✔ (verde scuro) / ✘ (rossa)** subito dopo la lettera, opzione esatta non scelta in verde, box PUNTEGGIO PLUM 2 righe sempre intero su UNA facciata |
| `shared/types.ts` | Tipi condivisi (se si aggiunge un campo `type`) |

**I limiti `/10` e `max(10)`** sono dinamici: lo script di clonazione (`change_quiz_theme.py`)
sostituisce automaticamente ogni riferimento `10`/`N` in UI, validatori, DB e PDF. Il voto finale è
**risposte corrette su N** (1 pt ciascuna, massimo N/N).

---

## 2. Formato JSON di input (comune a tutte le tipologie)

La skill di clonazione accetta un file JSON (modello:
`skills/quiz-interattivo-sorgente/templates/questions_example.json`):

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

**Numero domande:** qualsiasi (2, 5, 8, 10, 12, 15…). Lo script adatta tutto da solo.

> 💡 Lo script di default produce app a **risposta multipla**. Le sezioni 3-8 spiegano come un
> agente IA può estendere la copia clonata a **altre tipologie** (VERO/FALSO, risposta breve,
> fill-in-the-blanks, abbinamento immagine-parola, riordino) mantenendo intatti sessioni, codici
> classe, contatore studenti, report PDF e accessibilità.

---

## 3. Tipologia: RISPOSTA MULTIPLA a 3-4 opzioni (nativa) ✅

È la tipologia di default: nessuna modifica. Basta il JSON con 2-6 `options`.

**Esempio:** vedi sezione 2.

**Cosa succede:** UI studente → bottoni opzione; `answers.submit` confronta la stringa; PDF →
griglia A/B/C/D con wrapping; docente vede lettera+testo.

**Consigli per l'IA:**
- Le opzioni brevi (1-2 parole) stanno su 2 colonne; quelle lunghe vanno a capo da sole (il PDF
  calcola l'altezza con `splitTextToSize`). Non superare le ~6 opzioni per non allungare la pagina.
- `correctAnswer` deve essere **identico** (stesso testo, stessi spazi) a una `option`.
- Se il testo contiene virgolette o apostrofi usare sempre `'` escaped correttamente nel TS/JSON.

---

## 4. Tipologia: VERO / FALSO ✅ (nessuna modifica di codice)

Il motore MC gestisce **2 opzioni**, quindi VERO/FALSO si implementa **senza toccare il codice**:

```json
{
  "question": "Roma fu fondata nel 753 a.C. secondo la tradizione.",
  "options": ["Vero", "Falso"],
  "correctAnswer": "Vero"
}
```

**Cosa succede:** lo studente vede due bottoni VERO/FALSO; il PDF stampa `A) Vero  B) Falso`;
il report mostra la lettera e il testo. Tutto già funzionante.

**Variante estetica opzionale (per l'IA che vuole la UI dedicata):** se si desidera che i due bottoni
appaiano come interruttori VERO/FALSO stilizzati (verde/rosso) e che il PDF non mostri le lettere
A/B ma direttamente "Vero"/"Falso", si può aggiungere alla domanda il campo opzionale
`"type": "truefalse"` e rendere condizionale il rendering in `StudentQuiz.tsx` e `reportPdf.ts`
(vedi sezione 9 per il pattern). **Non necessario**: la resa standard è già chiara.

---

## 5. Tipologia: RISPOSTA BREVE di una parola ✍️ (richiede estensione guidata)

Lo studente **digita una parola** invece di scegliere tra opzioni.

### 5.1 JSON di input

```json
{
  "question": "Come si chiama il primo imperatore romano?",
  "type": "short",
  "correctAnswer": "Augusto"
}
```

### 5.2 Modifiche necessarie sulla COPIA clonata

1. **Domande** (`questions.ts` + `server/questions.ts`): aggiungere `type: "short"`; il campo
   `options` diventa opzionale/assente.
2. **Tipi** (`shared/types.ts`): aggiungere `type?: "multiple" | "truefalse" | "short" | ...`.
3. **UI studente** (`StudentQuiz.tsx` + mirror radice): se `currentQ.type === "short"`, mostrare un
   `<Input>` al posto dei bottoni; `handleSelectAnswer` invia il testo digitato (normalizzato).
4. **Confronto** (`server/routers.ts` + `routers.ts`): per `type === "short"` confrontare
   **case-insensitive** e ignorando spazi extra/accenti opzionali, es.:
   ```ts
   const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
   const isCorrect = q.type === "short"
     ? norm(q.correctAnswer) === norm(input.selectedAnswer)
     : q.correctAnswer === input.selectedAnswer;
   ```
5. **PDF** (`reportPdf.ts` + mirror): per `short`, stampare la riga risposta come testo libero
   (senza lettera né simbolo di opzione), rispettando il layout v2 (OpenDyslexic ≥ 14 pt,
   interlinea 1.5, UNA facciata per studente). Esempio di resa: la risposta data colorata
   `GREEN_DARK` se corretta / `RED` se errata e, se errata, la risposta esatta in verde accanto;
   NIENTE scritta "RISPOSTA DELLO STUDENTE" (rimossa nel v2 — la scelta è marcata sul posto).
6. **Docente** (`TeacherPage.tsx`): mostrare il testo digitato (già salvato in `selectedAnswer`).

**Attenzione:** il database salva `selectedAnswer` come stringa: va benissimo per la risposta breve.
Evitare `answers.submit` con `selectedAnswer` vuoto → validare con `.min(1)` nello zod.

---

## 6. Tipologia: FILL IN THE BLANKS strutturato (completa la frase) 🧩

La frase contiene **uno o più spazi vuoti** (blank) che lo studente compila digitando (o scegliendo
da un menu). Due livelli di complessità:

### 6.1 Livello semplice — UN solo blank (consigliato, minimo codice)

```json
{
  "question": "Roma fu fondata nel ______ secondo la tradizione.",
  "type": "fillblank",
  "correctAnswer": "753 a.C."
}
```

Trattare come **risposta breve** (sezione 5): l'input sostituisce il blank. Il testo della domanda
mostra `______` e lo studente digita la risposta sotto. Il confronto è normalizzato.

### 6.2 Livello strutturato — PIÙ blank (estensione completa)

```json
{
  "question": "______ e ______ fondarono Roma nel ______ a.C.",
  "type": "fillmulti",
  "blanks": ["Romolo", "Remo", "753"]
}
```

**Modifiche necessarie:**
1. La UI studente mostra la frase con N caselle numerate (al posto di ogni `______`), una per blank.
2. `selectedAnswer` inviato come **stringa con separatore** (es. `"Romolo|Remo|753"`) oppure come
   array JSON. Se si mantiene il campo `selectedAnswer: z.string()`, usare il separatore `|`.
3. Il confronto confronta blank per blank (normalizzato).
4. Il PDF stampa la frase con le caselle e, nel report, le risposte dello studente per ciascun blank.
5. Il riquadro PUNTEGGIO resta invariato (1 pt se TUTTI i blank corretti, oppure frazione: decidere
   e documentare — default consigliato: 1 pt per domanda completamente corretta per coerenza col
   voto su N).

---

## 7. Tipologia: ABBINAMENTO immagine-parola 🖼️ (estensione)

Lo studente abbina **immagini a parole** (o viceversa): ad es. 4 immagini di monumenti e 4 nomi.

```json
{
  "question": "Abbina ogni monumento al suo nome.",
  "type": "match",
  "pairs": [
    { "image": "https://esempio.it/colosseo.jpg", "word": "Colosseo" },
    { "image": "https://esempio.it/pantheon.jpg",  "word": "Pantheon" },
    { "image": "https://esempio.it/foro.jpg",      "word": "Foro Romano" },
    { "image": "https://esempio.it/circo.jpg",     "word": "Circo Massimo" }
  ]
}
```

**Modifiche necessarie:**
1. **Servire le immagini**: metterle in `client/public/images/` (es. `colosseo.jpg`) e riferirle come
   `/images/colosseo.jpg` (in produzione vengono servite da `dist/public/images/`). In alternativa
   URL assoluti (CDN/Drive). ⚠️ Con iframe/Blogger ricordare il CORS: gli URL assoluti pubblici
   vanno bene; i percorsi locali `/images/...` funzionano solo same-origin.
2. **UI studente**: mostra la griglia di immagini a sinistra e le parole (mescolate) a destra
   (o viceversa). Lo studente tocca/trascina per creare le coppie (1 immagine → 1 parola).
3. **Invio**: `selectedAnswer` serializzato, es. `"1=Colosseo;2=Pantheon;3=Foro Romano;4=Circo Massimo"`
   (indice immagine = parola scelta).
4. **Confronto**: splittare e confrontare ogni coppia.
5. **PDF**: stampare le immagini? Il PDF è generato con jsPDF (testo): si può (a) aggiungere le
   immagini con `doc.addImage()` se sono URL accessibili (funziona solo con CORS/remote enabled), o
   (b) in alternativa stampare l'elenco parole e le risposte dello studente come testo. Documentare
   la scelta fatta. Default consigliato per il "quiz in bianco": colonna immagini (se possibile)
   oppure didascalie "Immagine 1…4" + parole da abbinare.

**Nota di fattibilità:** questa è la tipologia più onerosa (assets, interazione drag/tap, PDF con
immagini). Per una prima versione affidabile si può usare il **matching parola→parola** (sinonimi,
capitali-regioni, autori-opere) con lo stesso pattern ma senza immagini → la UI diventa "unisci le
coppie" e il PDF resta testuale.

---

## 8. Tipologia: RIORDINO della parola (anagramma / frase da riordinare) 🔀

Lo studente **riordina le parole** di una frase (o le lettere di una parola) nell'ordine corretto.

```json
{
  "question": "Riordina le parole per formare la frase corretta.",
  "type": "reorder",
  "shuffled": ["fu", "Roma", "753 a.C.", "fondata", "nel"],
  "correctAnswer": "Roma fu fondata nel 753 a.C."
}
```

**Modifiche necessarie:**
1. **UI studente**: mostra le parole come "chip" mescolate; lo studente le tocca in sequenza per
   comporre la frase (oppure le trascina in ordine); un tap su una parola già scelta la rimanda
   indietro. Esiste già la palette `chip`/capsule nel tema.
2. **Invio**: `selectedAnswer` = frase composta (parole unite da spazio singolo).
3. **Confronto**: normalizzare (trim, spazi singoli, minuscole) e confrontare con `correctAnswer`
   normalizzata.
4. **PDF**: stampare le parole mescolate (in colonna, numerate) nel quiz in bianco; nel report
   stampare la frase dello studente e quella corretta.

**Alternativa più semplice (zero codice):** una **MC** dove le opzioni sono i possibili ordini?
Non è didatticamente ideale. Preferire l'estensione `reorder` se l'utente chiede esplicitamente il
riordino.

---

## 9. Pattern di implementazione trasversale (per l'agente IA)

Quando si aggiunge una tipologia, applicare SEMPRE questo schema (su tutte le copie mirror):

1. **Aggiungere `type` ai dati** in `questions.ts` + `server/questions.ts` (default `"multiple"` se
   assente, così le vecchie app restano valide).
2. **Estendere i tipi** in `shared/types.ts` (unione di tipologie).
3. **Rendering condizionale** in `StudentQuiz.tsx` (e mirror): uno `switch` su `q.type` che rende
   bottoni MC / input breve / caselle blank / matching / chip di riordino. Mantenere invariati:
   auto-salvataggio, re-entry, `answerSubmitted`, `currentRevealed`, barra di avanzamento.
4. **Confronto** in `server/routers.ts` + `routers.ts`: funzione `isAnswerCorrect(q, raw)` che
   normalizza in base al tipo. Il DB salva sempre `selectedAnswer: string`.
5. **PDF** in `reportPdf.ts` (e mirror): funzione di stampa condizionale per tipo, rispettando il
   layout v2 (OpenDyslexic ≥ 14 pt, interlinea 1.5, UNA facciata per studente). Per le altezze
   usare `splitTextToSize` + il **preflight reale `pickFactor`** (disegna una pagina di prova e, se
   il contenuto non entra, scala l'interlinea 1.5→1.15): è la garanzia che il riquadro PUNTEGGIO
   non venga MAI spezzato su due facciate. NON reintrodurre `blockH`/`computeQuestionHeight`
   (funzioni eliminate nel v2 2026-09-04).
6. **Docente** in `TeacherPage.tsx`: mostrare la risposta grezza dello studente e quella corretta
   (sono stringhe: nessuna modifica al salvataggio).
7. **Verifiche finali**:
   ```bash
   pnpm check
   diff questions.ts server/questions.ts
   diff StudentQuiz.tsx client/src/pages/StudentQuiz.tsx
   diff TeacherPage.tsx client/src/pages/TeacherPage.tsx
   diff reportPdf.ts client/src/lib/reportPdf.ts
   ```
   Poi test manuale: studente risponde (tutte le tipologie), docente scarica il PDF e verifica che
   il riquadro PUNTEGGIO resti su un'unica facciata.

> ⚠️ **Regola del "cambiare SOLO le domande":** per risposta multipla e VERO/FALSO il cambio è
> puramente dati (JSON). Per risposta breve, fill-in-the-blanks, abbinamento e riordino serve
> l'estensione guidata di cui sopra: la si applica UNA volta sulla copia clonata, poi il contenuto
> (domande, numero, parole, immagini) si cambia solo dal JSON. Se l'utente chiede una variante con
> una di queste tipologie, l'agente IA deve realizzare l'estensione con `pnpm check` pulito e
> verificare il comportamento live prima del deploy.

---

## 10. Verifica rapida del risultato

| Controllo | Atteso |
|---|---|
| `pnpm check` | Nessun errore TS |
| diff dei 4 mirror | Nessuna differenza |
| `/docente` apre classe e avvia sessione | Codice 4 cifre visibile |
| Studente risponde a tutte le domande (tipologia nuova inclusa) | Punteggio = N/N se tutto corretto |
| Report PDF | Riquadro PUNTEGGIO su un'unica facciata |
| Barra accessibilità presente su tutte le pagine | FONT/INTERLINEA/RIGHELLO/MODALITÀ/ASCOLTO funzionanti |
| Embed iframe | Altezza che si adatta (protocollo `labvisivo:height`) |

---

## 11. Riferimenti

- Skill di clonazione: `skills/quiz-interattivo-sorgente/SKILL.md` (+ script `clone_quiz_app.py`).
- Skill di modifica in-place: `skills/quiz-adapter/SKILL.md` (+ script `change_quiz_theme.py`).
- Template JSON: `skills/quiz-interattivo-sorgente/templates/questions_example.json`.
- Ricostruzione identica: `REBUILD.md`.
- Accessibilità: `ACCESSIBILITA.md`.
- Trasferimento su Render: `RENDER.md`.
