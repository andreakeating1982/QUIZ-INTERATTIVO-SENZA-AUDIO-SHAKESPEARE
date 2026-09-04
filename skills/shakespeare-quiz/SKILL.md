---
name: shakespeare-quiz
description: "Manutenzione completa e personalizzazione dell'app Shakespeare Quiz (QUIZ INTERATTIVO SORGENTE). Usare per: modificare UI studente/docente, correggere logica di sessione, deploy preview/produzione, personalizzare report PDF, modificare il contatore studenti attivi, gestire la barra di accessibilità (Font/Interlinea/Righello/Modalità/Ascolto-TTS, OpenDyslexic), i margini della prima pagina e l'altezza dinamica per embed iframe (labvisivo:height), la cornice dinamica per Blogger, gestire ZIP e checkpoint. NON usare per cambiare le domande del quiz (usare quiz-adapter, in-place) né per creare una NUOVA app con domande diverse (usare quiz-interattivo-sorgente)."
---

# Shakespeare Quiz (QUIZ INTERATTIVO SORGENTE) — Skill di Manutenzione

## Overview

L'app Shakespeare Quiz — d'ora in poi **QUIZ INTERATTIVO SORGENTE** — è un'applicazione full-stack interattiva per quiz in classe: gli studenti si uniscono con un codice e rispondono a domande a scelta multipla in tempo reale, il docente vede i punteggi in diretta e può scaricare report PDF.

**Per generare una NUOVA app identica con un set di domande diverso** (senza toccare questo sorgente) usa la skill **`quiz-interattivo-sorgente`** con il suo script `clone_quiz_app.py`. Questa skill serve SOLO alla manutenzione dell'app sorgente.

**Stack:** Vite + React 19 + TypeScript + TailwindCSS + tRPC + Drizzle ORM + PostgreSQL (driver `postgres`) + jsPDF

**Posizione progetto:** `/home/user/shakespeare-quiz`

**URL produzione:** https://shakespeare-quiz.easy-peasy.site

**Scaffold:** web-db-user (Vite + tRPC + Drizzle + Better Auth)

## Architettura — Mirror File System

**CRITICO:** La maggior parte dei file UI esiste in DUE copie identiche. Modificare sempre ENTRAMBE.

| File | Percorso radice | Percorso client |
|------|----------------|-----------------|
| UI studente | `StudentQuiz.tsx` | `client/src/pages/StudentQuiz.tsx` |
| UI docente | `TeacherPage.tsx` | `client/src/pages/TeacherPage.tsx` |
| Report PDF | `reportPdf.ts` | `client/src/lib/reportPdf.ts` |

### Struttura chiave del progetto

```
shakespeare-quiz/
├── StudentQuiz.tsx          ← UI studente (radice — mirror)
├── TeacherPage.tsx          ← UI docente (radice — mirror)
├── reportPdf.ts             ← Generazione PDF report (radice — mirror)
├── server/
│   ├── questions.ts         ← Array domande del quiz
│   ├── routers.ts           ← Endpoint tRPC (API)
│   ├── db.ts                ← Helpers database
│   └── schema.ts            ← Schema Drizzle (Student, Class, Answer)
├── client/
│   └── src/
│       ├── pages/
│       │   ├── StudentQuiz.tsx  ← mirror
│       │   └── TeacherPage.tsx  ← mirror
│       └── lib/
│           ├── reportPdf.ts    ← mirror
│           └── trpc.ts         ← Client tRPC
├── drizzle/                 ← Migrazioni database
├── GUIDA-*.pdf              ← Guide PDF per l'utente
└── package.json
```

### Database (PostgreSQL via Drizzle)

- **Student:** `id`, `name`, `classId`, `createdAt`, `completed`, `score`
- **Class:** `id`, `name`, `password`, `currentQuestion`, `revealedQuestions`, `active`, etc.
- **Answer:** `id`, `studentId`, `classId`, `questionNumber`, `selectedAnswer`, `isCorrect`, `createdAt`

## Workflow di Deploy

### Preview (sandbox — test temporaneo)

```bash
webdev_save_checkpoint "descrizione significativa"
webdev_deploy mode=preview
```

Restituisce un URL sandbox temporaneo. VA usato SEMPRE prima del deploy produzione.

### Produzione (Cloud Run — permanente)

```bash
webdev_save_checkpoint "descrizione significativa"
webdev_deploy mode=preview      # prima test
# fermarsi: chiedere conferma all'utente
webdev_deploy mode=production   # solo dopo OK utente
```

**Regola:** Mai deploy produzione nella stessa response in cui si scrive codice o si crea preview. Chiedere SEMPRE approvazione esplicita.

### Creare ZIP del progetto (pacchetto GitHub aggiornato)

Il pacchetto include il codice aggiornato + la cartella `skills/` interna (le 3 skill: quiz-interattivo-sorgente, quiz-adapter, shakespeare-quiz) + README, GUIDA-SKILL-GITHUB.md, ISTRUZIONI-GITHUB e **i documenti per agenti IA**: `REBUILD.md` (ricostruzione identica da GitHub), `ADATTARE.md` (varianti: contenuto/numero/**tipologia** domande — VERO/FALSO, risposta multipla 3-4 opzioni, fill-in-the-blanks, abbinamento immagine-parola, riordino, risposta breve), `RENDER.md` (Easy-Peasy → GitHub → Render), `ACCESSIBILITA.md` (⭐ misure riusabili), `AGENTS.md` (istruzioni per agenti), + i 3 Dockerfile (`Dockerfile` a root e `deploy/Dockerfile` = build completo dal sorgente con migrazioni all'avvio; `deploy/Dockerfile.render` = multi-stage per Render, referenziato da `render.yaml`) + `deploy/docker-entrypoint.sh` (esegue `drizzle-kit push` poi avvia il server) e `render.yaml`. Esclude node_modules, .git, dist, zip, PDF delle guide (pesanti), backup, log e .env (segreto).

```bash
cd /home/user/shakespeare-quiz
zip -r /home/user/QUIZ-INTERATTIVO-SORGENTE-GITHUB.zip . \
  -x "node_modules/*" -x ".git/*" -x "dist/*" -x "*.zip" -x "*.pdf" \
  -x ".quiz-backups/*" -x "dev-server.log" -x ".wrangler/*" -x ".env" \
  -x "GITHUB-DESKTOP-fixed.zip"
```

Verificare che dentro lo ZIP ci siano: `cornice-dinamica/` (tutti gli embed + fonts + README), i 5 documenti IA (`REBUILD.md`, `ADATTARE.md`, `RENDER.md`, `ACCESSIBILITA.md`, `AGENTS.md`), `Dockerfile` (root), `render.yaml`, `skills/` (3 skill). Poi consegnare con `send_attachment` (file_path) e ricordare all'utente che può caricarlo su GitHub; per una NUOVA app con domande diverse usare la skill quiz-interattivo-sorgente (anche con `--source` = URL della repository GitHub).

### Documentazione per agenti IA inclusa nel pacchetto (dal 2026-09-03)

Il pacchetto ZIP/repository contiene 5 documenti pensati per essere letti e seguiti automaticamente da agenti IA (oltre a `GUIDA-SKILL-GITHUB.md` per l'utente):

| File | Contenuto |
|---|---|
| `REBUILD.md` | Ricostruzione IDENTICA dell'app da GitHub: prerequisiti, `pnpm install`, `.env` (DATABASE_URL PostgreSQL), `pnpm db:push`, `pnpm dev/check/build`, verifica dei 4 mirror, mappa della struttura |
| `ADATTARE.md` | Come creare VARIANTI cambiando SOLO il set di domande: contenuto, numero e **tipologia** (risposta multipla 3-4 opzioni ✅ nativa, VERO/FALSO ✅ come 2 opzioni, risposta breve ✍️, fill-in-the-blanks 🧩, abbinamento immagine-parola 🖼️, riordino 🔀) con JSON di esempio e pattern di estensione (type + switch in StudentQuiz/reportPdf/routers) |
| `RENDER.md` | Trasferimento Easy-Peasy AI → GitHub → Render: Blueprint `render.yaml`, Dockerfile root, migrazioni automatiche, verifica, embed Blogger con nuovo APP_URL |
| `ACCESSIBILITA.md` | ⭐ Sezione ACCESSIBILITÀ: elenco misure riusabili (OpenDyslexic, barra 5 moduli, TTS, screen reader, contrasto, righello, reduced-motion, heightSync, cornice, CORS /fonts) + checklist per applicarle ad altre app |
| `AGENTS.md` | Regole operative per agenti IA sulla repo: mirror critici, comandi rapidi, dove vive ogni cosa, flussi clone/adapter, cosa NON fare |

**Nota DB importante:** il codice usa **PostgreSQL** (`drizzle-orm/postgres-js` + driver `postgres`, schema `pgTable` in `drizzle/schema.ts`), NON SQLite. I riferimenti "SQLite (Better-SQLite3)" in vecchi README/skill sono obsoleti e vanno aggiornati quando li si incontra.

## Modifiche Comuni alla UI

### 1. Pulsante HOME (schermata join studente)

**File:** StudentQuiz.tsx (root + client/src/pages/)

Il pulsante va sotto il titolo "QUIZ INTERATTIVO". Usa icona `House` da `lucide-react`.

```tsx
import { House } from "lucide-react";
// ...
<Button onClick={() => window.location.href = '/'} ...>
  <House className="mr-2 size-4" /> HOME
</Button>
```

**Attenzione:** Import `House` esiste? Verificare `lucide-react` import. In caso usare `Home`.

### 2. Footer REALIZZATO DA ANDREA CENTINARO — RIMOSSO OVUNQUE

**Stato (dal 2026-09-03):** Il footer "Realizzato da Andrea Centinaro" è stato RIMOSSO da TUTTE le pagine dell'app, come nell'app sorgente LATINO-FACILE-APPLICAZIONE. Non esiste più alcun `<footer>` con quella scritta. **Non reinserirlo** in: `Home.tsx`, `TeacherPage.tsx` (root + mirror), `StudentQuiz.tsx` (root + mirror).

### 3. Contatore STUDENTI ATTIVI (TeacherPage)

**Problema originale:** Il filtro "fantasma" (ghost filter) rimuoveva studenti senza risposte recenti, azzerando il contatore se il docente andava avanti veloce.

**Soluzione attuale:** `activeStudents` restituisce TUTTI gli studenti iscritti (nessun filtro temporale).

```tsx
const activeStudents = useMemo(() => {
  if (!stats) return [];
  return stats.students as any[];
}, [stats]);
```

**Cosa controllare se il contatore non funziona ancora:**
- Il punteggio per studente mostra `—` finché non completa tutte le domande? → Correggere: usare `correctAnswers` calcolato da `stats.answers` filtrati per `studentId` e `isCorrect`.
- La variabile `correctAnswers` è definita nel map? Aggiungere `const correctAnswers = studentAnswers.filter((a: any) => a.isCorrect).length;`.
- Il display del punteggio usa `student.completed ? ... : '—'`? Cambiare con `studentAnswers.length > 0 ? correctAnswers + '/10' : '—'`.

### 4. Persistenza sessione studente (reingresso)

Quando uno studente ricarica la pagina o rientra in sessione, l'app deve:
1. Caricare le risposte già date (API `getMyAnswers`)
2. Disabilitare il submit se ha già risposto alla domanda corrente
3. Mostrare messaggio "Hai già risposto a questa domanda."

**Lato server (server/routers.ts):**
```typescript
getMyAnswers: protectedProcedure
  .input(z.object({ classId: z.string(), studentId: z.string() }))
  .query(async ({ ctx, input }) => {
    const answers = await ctx.db.select().from(answers).where(
      and(eq(answers.classId, input.classId), eq(answers.studentId, input.studentId))
    );
    return answers;
  }),
// Blocco doppie risposte in saveAnswer:
const existing = await ctx.db.select().from(answers).where(
  and(eq(answers.classId, input.classId), eq(answers.studentId, input.studentId), eq(answers.questionNumber, input.questionNumber))
);
if (existing.length > 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Hai già risposto a questa domanda." });
```

**Lato client (StudentQuiz.tsx):**
- Chiamare `getMyAnswers` al mount per popolare `savedAnswers`
- Confrontare `savedAnswers[currentQNum]` per decidere se bloccare submit
- Messaggio in basso: `<p className="text-xs text-amber-600 font-medium">Hai già risposto a questa domanda.</p>`

### 5. Report PDF — Layout completo (v2, 2026-09-04: OpenDyslexic · una facciata · ✔/✘ vettoriali)

**File:** reportPdf.ts (root + client/src/lib/) — **mantenere i due mirror IDENTICI** (verificare con `diff`).

**Struttura del layout v2 (dopo la rifattorizzazione del 2026-09-04):** ogni studente sta SEMPRE su **UNA sola facciata A4**: titolo + nome studente + riga Classe/Data/Voto + filetto dorato + 10 domande (opzioni in linea, con il simbolo ✔/✘ subito a destra della lettera) + legenda + box PUNTEGGIO. Stessa cosa per il QUIZ IN BIANCO (1 pagina: campi COGNOME/NOME/CLASSE/DATA + 10 domande con casella-risposta + box PUNTEGGIO). **RIMOSSI** la sezione "RISPOSTE CORRETTE / INCORRETTE" e la scritta blu "RISPOSTA DELLO STUDENTE": al loro posto la scelta è marcata con **✔ verde scuro** (corretta) o **✘ rossa** (errata) **subito a destra della lettera dell'opzione scelta** (es. `B) ✔ Anne Hathaway`), e l'opzione esatta non scelta è in verde.

#### 5a. Geometria, colori e font (v2)

```typescript
const PAGE_W = 210, PAGE_H = 297;   // A4 mm
const M = 16;                        // margine orizzontale mm
const CW = PAGE_W - 2 * M;           // 178 mm (larghezza contenuto)
const M_TOP = 12;                    // margine superiore visivo mm
const M_BOT = 12;                    // margine inferiore mm
const MM_PER_PT = 0.352778;
const FACTORS = [1.5, 1.45, 1.4, 1.35, 1.3, 1.25, 1.2, 1.15]; // interlinea: parte da 1.5
const INK  = [46, 33, 24];    // testo #2e2118
const PLUM = [168, 88, 56];   // titoli/bordi #a85838
const GOLD = [190, 142, 79];  // filetto #be8e4f
const GREEN = [30, 125, 50];       // opzione esatta (testo)
const GREEN_DARK = [14, 92, 36];   // spunta ✔ (più scura del verde della risposta)
const RED = [190, 40, 40];         // ✘ errata
const GREY = [120, 110, 100];      // linee scrittura campi
const SYMBOL_W = 4.8;              // larghezza occupata dal simbolo vettoriale (mm)
const MARK_GAP_AFTER_LETTER = 1.7; // spazio tra "B)" e il simbolo ✔/✘
const MARK_GAP_BEFORE_TEXT = 1.7;  // spazio tra il simbolo e il testo (simmetrico)
```

**Simboli ✔/✘ = GRAFICA VETTORIALE, NON testo:** OpenDyslexic (come il fallback `times` di jsPDF) NON contiene i glifi Unicode U+2714/U+2718: i simboli vengono DISEGNATI da `drawSymbol(doc, kind, color, x, y)` subito a destra della lettera dell'opzione scelta, dentro un box largo `SYMBOL_W = 4.8` mm, con gap simmetrici `MARK_GAP_AFTER_LETTER = MARK_GAP_BEFORE_TEXT = 1.7` mm. Geometria raffinata (2026-09-04, centrata sul cap-height reale del font ≈ 3.6 mm sopra la baseline a 14 pt): ✔ tracciata con `doc.lines` che parte da `(x+0.35, y−3.85)` con punti `[1.0, 3.3]` e `[2.7, −2.9]`, `setLineJoin("miter")`; ✘ con due `doc.line` da `(x+0.55, y−0.7)` a `(x+4.15, y−3.7)` (e l'incrocio inverso), `setLineJoin("round")`; entrambe `setLineWidth(1.0)` e `setLineCap("round")`. Colori: ✔ `GREEN_DARK`, ✘ `RED`. In `buildOptionSegments` il simbolo è un **pezzo composito indivisibile** con la lettera (`parts: [lettera, symbol, testo]`): non viene MAI spezzato a capo separandolo dalla lettera.

**Font:** OpenDyslexic **Regular + Bold** embedded via `ensureFonts(doc, fontsBase)` (fetch di `/fonts/OpenDyslexic-Regular.ttf` e `-Bold.ttf` → `addFileToVFS` + `addFont`), con **fallback automatico su `times`** se il fetch fallisce. `fontsBase = ""` nel browser (i font stanno in `client/public/fonts/`, serviti da `/fonts/...`); nei test Node passare l'URL del server. `fontState = { name, fallback }` e `fontCache` evitano fetch ripetuti. `setFontNormal/setFontBold/setFontItalic` usano `fontState.name`; l'italico esiste solo sul fallback times.

**Interlinea minima 1.5, font minimo 14 pt** su tutta la pagina (titolo e box PUNTEGGIO a 15 pt). Altezza riga = `mmLineHeight(sizePt, factor) = sizePt * factor * MM_PER_PT` (14 pt × 1.5 = 7.41 mm).

#### 5b. Garanzia "una sola facciata" — preflight REALE (pickFactor)

Non ci sono page break "a metà": il fattore di interlinea (max 1.5) viene scelto con un **preflight che disegna davvero** la pagina su un documento di prova e verifica che l'ultima riga (box PUNTEGGIO incluso) resti dentro `bottomLimit = PAGE_H - M_BOT` (285 mm):

```typescript
async function pickFactor(data, student): Promise<number> {
  for (const f of FACTORS) {                       // 1.5 → 1.15
    const probe = new jsPDF({ unit: "mm", format: "a4" });
    await ensureFonts(probe, fontsBase);
    probe.setLineHeightFactor(f);
    const endY = drawReportPage(probe, data, student, f);  // disegno REALE
    if (endY <= bottomLimit) return f;
  }
  return FACTORS[FACTORS.length - 1];
}
```

Per il report si usa un **fattore unico per tutte le pagine** = il minimo tra i fattori richiesti dai singoli studenti (coerenza grafica). Il quiz in bianco usa lo stesso meccanismo con `drawBlankPage`. **Regola:** se un contenuto normale entra a 1.5, il fattore resta 1.5 (mai abbassarlo "per sicurezza": si perde l'interlinea richiesta).

#### 5c. Funzioni di disegno (v2) e il bug dell'avanzamento y

- `drawWrapped(doc, lines, x, y, lineH)` — disegna righe una sotto l'altra e ritorna `y + lines.length * lineH` (la baseline della riga SUCCESSIVA).
- `drawInline(doc, segs, x, y, maxW, gap, lineH)` — disegna segmenti (opzioni) in linea con wrap automatico a capo (gap 3 mm tra opzioni); ritorna **`y + lineH`** = baseline della riga successiva.

> **⚠️ BUG STORICO (fix 2026-09-04):** `drawInline` ritornava `y` (baseline dell'ultima riga disegnata). Quando le opzioni stavano su UNA sola riga, la domanda successiva partiva a `+1.6 mm` invece che a `+lineH + 1.6 mm` → **sovrapposizione** di tutte le domande. Il return corretto è `y + lineH` (come `drawWrapped`). NON riportare mai a `return y`.

Nel ciclo domande del report e del quiz: `y = drawWrapped(doc, qLines, ...) + 0.4;` poi `y = drawInline(doc, segs, ...) + 1.6;` — con `drawInline` che restituisce la riga successiva, la domanda seguente riparte correttamente a un'interlinea + 1.6 mm dopo le opzioni.

#### 5d. Filetto dorato e spazio sotto (bug fix: 4.3 mm report · 7.6 mm quiz)

Dopo l'header (nome studente / campi), il filetto GOLD `doc.line(M, y - 1.4, PAGE_W - M, y - 1.4)` viene disegnato e poi si incrementa `y`.

> **⚠️ BUG STORICO (fix 2026-09-04):** lo spazio sotto il filetto era `y += 1.2` (report) / `y += 1` (quiz). L'ascesa dei glifi OpenDyslexic a 14 pt è ~3.8 mm: la baseline della prima domanda distava solo ~2.4 mm dal filetto, quindi la cima delle lettere (es. il `?` di "born?") **tagliava la linea**.

**REPORT → `y += 4.3`:** con 4.3 mm la cima dei glifi (che sale ~3.8 mm sopra la baseline) resta ~2.2 mm sotto il filetto. NON riportare a valori < 3.5.

**QUIZ IN BIANCO → `y += 7.6` (NON 4.3!):** la casella quadrata della domanda 1 è disegnata a `boxY = y - lh14 * 0.78` ≈ 5.78 mm SOPRA la baseline (a 14 pt × 1.5). Con `y += 4.3` il bordo superiore della casella (top = y−5.78) finiva ~0.1 mm SOPRA la linea del filetto (posta a y−5.7): la casella **toccava/sforava il filetto**. Con `y += 7.6` la casella resta ~3.2 mm sotto la linea. NON riportare a 4.3 in `drawBlankPage`.

#### 5e. Report PDF — contenuto della pagina (drawReportPage)

Ordine e stili (tutto ≥ 14 pt):

1. **Titolo** centrato: `QUESTIONARIO SU WILLIAM SHAKESPEARE` — 15 pt bold PLUM.
2. **Studente** centrato: `Studente: <nome>` — 15 pt bold INK (usa `splitTextToSize` per nomi lunghi).
3. **Riga info** centrata: `Classe: X · Data: gg/mm/aaaa · Voto: N/10` — 14 pt normal INK (`fmtDate` converte in it-IT).
4. **Filetto** GOLD 0.35 mm + `y += 4.3` (vedi 5d).
5. **10 domande:** testo domanda 14 pt bold INK con `splitTextToSize` (`CW - 4`), poi opzioni in linea via `drawInline`. Le opzioni sono costruite da `buildOptionSegments(q, selected)`:
   - scelta GIUSTA → composito `lettera) ✔ testo`: **✔ verde scuro** (`GREEN_DARK`) subito dopo la lettera, testo opzione **verde bold**;
   - scelta SBAGLIATA → composito `lettera) ✘ testo`: **✘ rossa** (`RED`) subito dopo la lettera, testo opzione **rosso bold**;
   - opzione esatta **non scelta** → testo opzione **verde** (senza simbolo);
   - se lo studente non ha risposto → nessuna opzione marcata, ma l'esatta resta verde.
6. **Legenda** (dopo l'ultima domanda, da `buildLegendSegments()`): `✔ risposta corretta · ✘ risposta errata · verde = risposta esatta` — simboli vettoriali (✔ `GREEN_DARK`, ✘ `RED`) + testo 14 pt normal INK.
7. **Box PUNTEGGIO** (mai separato, rounded rect PLUM 0.5 mm): riga grande `PUNTEGGIO: N/10` (15 pt bold PLUM) + riga piccola `Ogni risposta corretta vale 1 punto · Massimo 10/10` (14 pt normal INK), centrato.

#### 5f. Quiz in bianco PDF — contenuto della pagina (drawBlankPage)

1. **Titolo** centrato 15 pt bold PLUM.
2. **Campi su una riga:** `COGNOME: ____ NOME: ____ CLASSE: ____ DATA: ____` — 14 pt bold PLUM, 4 colonne (`colW = CW / 4`), linee di scrittura GREY sotto ogni etichetta.
3. **Filetto** GOLD + `y += 7.6` ⚠️ (NON 4.3: la casella della domanda 1 sale `lh14*0.78`≈5.78 mm sopra la baseline, con 4.3 sforava il filetto; con 7.6 resta ~3.2 mm sotto).
4. **10 domande:** per ciascuna, **casella quadrata** PLUM 7×7 mm a sinistra (dove lo studente scrive la lettera-risposta) centrata sulla prima riga (`boxY = y - lh14 * 0.78`), poi testo domanda 14 pt bold indentato `M + boxSide + 3`, opzioni A-D in linea 14 pt normal.
5. **Box PUNTEGGIO** con scritta `PUNTEGGIO` (15 pt bold PLUM) e `Ogni risposta corretta vale 1 punto · Massimo 10/10` (14 pt).

#### 5g. Sintomi e diagnosi rapida (v2)

| Problema | Causa probabile | Soluzione |
|----------|----------------|-----------|
| Le domande si accavallano tra loro | `drawInline` ritorna `y` invece di `y + lineH` | Ripristinare `return y + lineH` in `drawInline` (vedi 5c) |
| La prima domanda taglia il filetto dorato (report) | Spazio sotto il filetto troppo piccolo | `y += 4.3` dopo `doc.line(...)` (vedi 5d) |
| La **casella** della domanda 1 tocca/sfora il filetto (quiz in bianco) | `drawBlankPage` usa lo stesso `y += 4.3` del report, ma la casella sale 5.78 mm sopra la baseline | `y += 7.6` in `drawBlankPage` (vedi 5d) — verificare con misura pixel a 300 dpi (atteso: ~3.2 mm) |
| Il PDF esce su 2 pagine | Contenuto non entra a fattore 1.5 | Controllare che il preflight `pickFactor` esista e usi `drawReportPage` reale; verificare con un test Node |
| Nei test Node i caratteri non sono OpenDyslexic | `fontsBase` non raggiungibile (fetch fallito) | Passare l'URL del server che serve `/fonts/`; il fallback è `times` |
| Legenda/stime citano "data corretta" | Refuso nelle funzioni di stima (codice morto) | Usare "✔ = risposta corretta · ✘ = risposta errata · verde = risposta esatta" |
| Mirror disallineati | Edit applicato a una sola copia | `diff reportPdf.ts client/src/lib/reportPdf.ts` → allineare |

**Nota:** le funzioni `estimateReportPage` / `estimateBlankPage` / `measureQuestionReport` / `measureBlankQuestion` / `countLines` / `countInlineLines` sono **stime NON usate** nel flusso di produzione (il preflight disegna davvero). Aggiornarle comunque se si cambia il layout, per non lasciare codice fuorviante.

#### 5h. Test rapido della generazione PDF (Node)

Compilare il mirror client e generare i PDF campione in `/home/user/pdf-test/`:

```bash
cd /home/user/shakespeare-quiz
npx esbuild client/src/lib/reportPdf.ts --bundle --platform=node --format=cjs --outfile=__pdftmp_report.cjs --log-level=error
node __pdftmp_run.cjs   # runner che chiama buildReportPdfDoc / buildBlankQuestionsPdfDoc con fontsBase = URL server
```

Verifiche oggettive: `pdffonts` deve mostrare **OpenDyslexic** embedded; `pdftotext -bbox` per controllare 0 sovrapposizioni e 1 pagina per studente; `pdftoppm -png -r 120` per l'ispezione visiva. **Eliminare sempre i `__pdftmp_*.cjs` dalla root prima di creare lo ZIP.** I PDF campione vanno tenuti in `/home/user/pdf-test/` (fuori dalla repo).

### 6. Dashboard docente — badge statistiche

**File:** TeacherPage.tsx (root + client/src/pages/)

La dashboard docente mostra una riga di badge statistici in cima alla pagina:

```tsx
{/* Riga 3: statistiche + pulsanti azioni */}
<div className="flex flex-col gap-3">
  <div className="flex flex-wrap items-center justify-center gap-2">
    {/* Badge STUDENTI ATTIVI — DA TENERE */}
    <div className="flex flex-col rounded-lg bg-card border border-emerald-300 px-3 py-2">
      <span className="text-[10px] leading-tight text-emerald-600">NUMERO STUDENTI ATTIVI<br/>NELLA SESSIONE IN CORSO</span>
      <span className="font-bold text-sm text-emerald-700">{activeStudents.length}</span>
    </div>

    {/* Badge NUMERO COMPLESSIVO — DA ELIMINARE */}
    <div className="flex flex-col rounded-lg bg-card border border-plum/30 px-3 py-2">
      <span className="text-[10px] leading-tight text-plum">NUMERO COMPLESSIVO DI STUDENTI<br/>FINORA PARTECIPANTI</span>
      <span className="font-bold text-sm text-plum">{stats?.totalStudents || 0}</span>
    </div>
  </div>
</div>
```

**Decisione:** Il badge "NUMERO COMPLESSIVO DI STUDENTI FINORA PARTECIPANTI" è stato rimosso perché ridondante — il numero di studenti attivi è già sufficiente per il docente. Per rimuoverlo, eliminare l'intero `<div>` del badge (4 righe: div + span + span + chiusura div) da ENTRAMBI i mirror. Lasciare il badge "STUDENTI ATTIVI" invariato.

**Pattern di eliminazione:** Cercare il blocco esatto e sostituirlo con stringa vuota:

```
<div className="flex flex-col rounded-lg bg-card border border-plum/30 px-3 py-2">
  <span className="text-[10px] leading-tight text-plum">NUMERO COMPLESSIVO DI STUDENTI<br/>FINORA PARTECIPANTI</span>
  <span className="font-bold text-sm text-plum">{stats?.totalStudents || 0}</span>
</div>
```

La riga vuota residua (`\n                          `) va anch'essa rimossa per pulizia.

### 7. ELIMINA CLASSE — dalla sidebar alla dashboard

**File:** TeacherPage.tsx (root + client/src/pages/)

**Obiettivo:** Togliere il cestino (Trash2) dalla sidebar "LE TUE CLASSI" e mettere un pulsante "ELIMINA CLASSE" nella dashboard docente.

**Passaggi:**
1. **Rimuovere Trash2 dall'import** (linea `ChevronDown, ChevronUp, ..., Trash2,` → rimuovere `Trash2,`)
2. **Rimuovere il `<span>` con Trash2** dalla sidebar (blocco di 3 righe con `onClick`, `confirm`, `deleteClass.mutate`)
3. **Aggiungere pulsante ELIMINA CLASSE** dopo il pulsante CHIUDI nella dashboard:
```tsx
<Button onClick={() => { if (confirm('Eliminare definitivamente la classe \"' + activeClassInfo.name + '\" (' + activeClassInfo.code + ')?')) { deleteClass.mutate({ id: activeClassInfo.id }); } }} variant="outline" className="border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600 rounded-xl h-9 px-3 text-xs sm:text-sm">
  ELIMINA CLASSE
</Button>
```
4. **Chiudere la dashboard dopo eliminazione:** Aggiungere `setActiveClassId(null)` e `setActiveClassInfo(null)` nell'`onSuccess` del mutation `deleteClass`:
```typescript
const deleteClass = trpc.classes.delete.useMutation({
  onSuccess: () => {
    toast.success("Classe eliminata definitivamente");
    setActiveClassId(null);    // ← AGGIUNGERE
    setActiveClassInfo(null);  // ← AGGIUNGERE
    utils.classes.listAll.invalidate();
  },
  onError: (err) => toast.error(err.message),
});
```

**Attenzione:** L'eliminazione è definitiva! Usare sempre `confirm()` prima di chiamare il mutation.

### 8. Hotspot studente — uniformato a LE TUE CLASSI

**File:** TeacherPage.tsx (root + client/src/pages/)

**Obiettivo:** Allineare l'hotspot degli studenti nella sezione "STUDENTI ATTIVI NELLA SESSIONE" allo stesso stile usato in "LE TUE CLASSI".

**Stile hotspot LE TUE CLASSI** (sidebar, ~linea 372):
```tsx
<div className={`size-2 rounded-full shrink-0 ${cls.isActive ? "bg-green-500" : "bg-gray-300"}`} />
```
Un semplice pallino di 8px (`size-2`) senza ring.

**Stile hotspot STUDENTI ATTIVI (PRIMA):**
```tsx
<span className="relative block w-3 h-3 rounded-full bg-muted-foreground/40 ring-2 ring-muted-foreground/20 shrink-0" />
```
Un cerchio di 12px (`w-3 h-3`) con ring.

**Stile hotspot STUDENTI ATTIVI (DOPO):**
```tsx
<div className="size-2 rounded-full shrink-0 bg-gray-300" />
```
Identico a LE TUE CLASSI.

**Modifiche correlate:**
- Rimosso il cerchio verde/ambra con icona `Check`/`Clock` che c'era prima dell'hotspot (era un `size-8 rounded-lg` con bg-color dinamico)
- Ora ogni studente mostra solo: `⚪ hotspot | NOME centrato | X/10 + [X]`

### 9. Layout student row — nome centrato con griglia

**File:** TeacherPage.tsx (root + client/src/pages/)

**Obiettivo:** Centrare il nome dello studente tra l'hotspot (sinistra) e gli elementi di conteggio (destra).

**Prima:** Layout con `flex`:
```tsx
<button className="w-full flex items-center gap-3 p-3 ...">
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <hotspot />
    <p>{student.name}</p>
    <p className="text-muted-foreground">In corso · X/10 risposte</p>  {/* rimosso dopo */}
  </div>
  <score />
  <XButton />
</button>
```

**Dopo:** Layout con `grid grid-cols-[auto_1fr_auto]`:
```tsx
<button className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 ...">
  {/* Col 1 (auto): hotspot */}
  <hotspot />
  {/* Col 2 (1fr, text-center): nome centrato */}
  <p className="font-medium text-sm text-foreground truncate text-center">{student.name}</p>
  {/* Col 3 (auto): score + X + chevron */}
  <div className="flex items-center gap-2 flex-shrink-0">
    <span className="...">{score}</span>
    <XButton />
    <Chevron />
  </div>
</button>
```

### 10. Testi di stato grigi rimossi

**File:** TeacherPage.tsx (root + client/src/pages/)

**Rimossi** dalla riga di ogni studente:
- `In attesa` (studente non ha ancora risposto)
- `In corso · X/10 risposte` (studente sta rispondendo)
- `COMPLETATO` (non presente nel codice corrente)

**Pattern da rimuovere** (cercare e cancellare l'intero blocco `<p>`):
```tsx
<p className="text-xs text-muted-foreground whitespace-nowrap">
  {student.completed ? '' : studentAnswers.length > 0 ? 'In corso · ' + studentAnswers.length + '/10 risposte' : 'In attesa'}
</p>
```

**Nota:** Rimangono solo i badge/section-level "Sessione in attesa" (ambra) e "Studenti in attesa di risposta" (section heading) — NON sono testi grigi per-studente, quindi non vanno rimossi.

### 11. Input sidebar centrati

**File:** TeacherPage.tsx (root + client/src/pages/)

**Obiettivo:** Tutti gli input nella sidebar docente (creazione/riapertura classe) devono avere il cursore che parte dal centro e il testo centrato.

**Passaggi:**
1. **Rimuovere il CSS override** che forzava l'allineamento a sinistra:
```css
/* DA RIMUOVERE: */
aside input, aside input::placeholder {
  text-align: left !important;
}
```
2. **Cambiare `!text-left` in `!text-center`** su tutti gli input nella sidebar:
   - `Input placeholder="Nome classe"` → `!text-center`
   - `Input type="password" placeholder="Password"` → `!text-center`
   - `Input placeholder="Codice"` → `!text-center`
   - `Input type="password" placeholder="Password"` (riapertura) → `!text-center`
   - `Input type="date"` è già `!text-center` ✅

**Nota:** Il codice `pl-8` (padding-left) sul campo Codice può essere rimosso quando si centra il testo, altrimenti il padding sposta il testo verso destra.

### 12. Testo RISPOSTA ESATTA — maiuscolo e pt 10

**File:** TeacherPage.tsx (root + client/src/pages/)

**Obiettivo:** Uniformare a uppercase e font size pt 10 (~13px) i testi "RISPOSTA ESATTA:" e il conteggio "X STUDENTI HANNO RISPOSTO CORRETTAMENTE".

**Prima:**
```tsx
<div>
  <span className="text-xs font-medium text-green-700">RISPOSTA ESATTA: </span>
  <span className="text-base font-bold text-green-800">{currentRevealed.a}</span>
</div>
<div className="text-sm font-medium text-green-700">
  {correctCount} {correctCount === 1 ? 'studente ha' : 'studenti hanno'} risposto correttamente
</div>
```

**Dopo:**
```tsx
<div className="text-[13px] font-medium text-green-700">
  RISPOSTA ESATTA: <span className="font-bold text-green-800">{currentRevealed.a}</span>
</div>
<div className="text-[13px] font-medium text-green-700 uppercase">
  {correctCount} {correctCount === 1 ? 'STUDENTE HA' : 'STUDENTI HANNO'} RISPOSTO CORRETTAMENTE
</div>
```

**Modifiche chiave:**
- `text-xs` (9pt) → `text-[13px]` (~10pt) per RISPOSTA ESATTA
- `text-sm` (10.5pt) → `text-[13px]` (~10pt) per il conteggio
- `'studente ha'` / `'studenti hanno' risposto correttamente` → MAIUSCOLO
- Entrambi ora nello stesso `<div>` con classi condivise
- `uppercase` aggiunto al div del conteggio

## Comandi utili

| Operazione | Comando |
|-----------|---------|
| TypeScript check | `pnpm check` (nella cartella progetto) |
| Build produzione | `pnpm build` |
| Dev server | `pnpm dev` |
| Installare pacchetto | `pnpm add <pacchetto>` |
| Checkpoint git | `webdev_save_checkpoint` |
| Rollback | `webdev_rollback_checkpoint version_id=<hash>` |

### 13. IN ATTESA DI INVIO — logica per-domanda corrente

**File:** TeacherPage.tsx (root + client/src/pages/)

**Problema originale:** `studentAnswers.length === 10 ? correctAnswers + '/10' : 'IN ATTESA DI INVIO'` mostrava "IN ATTESA DI INVIO" solo quando lo studente non aveva ANCORA INVIATO NESSUNA risposta. Il docente voleva che "IN ATTESA DI INVIO" comparisse OGNI VOLTA tra l'inizio di una nuova domanda e la risposta dello studente.

**Soluzione attuale (logica per-domanda):**

```tsx
// Dentro il .map() degli studenti, dopo `const isExpanded`:
const hasAnsweredCurrent = classDetail?.currentQuestion
  ? studentAnswers.some((a: any) => a.questionNumber === classDetail.currentQuestion)
  : studentAnswers.length > 0;
```

**Riga studente (aggiornata — allineata all'app Parole-chiave):** il layout è `flex` (NON più `grid grid-cols-[auto_1fr_auto]`, che faceva collassare la colonna del nome quando compariva "IN ATTESA DI INVIO", rendendo il nome invisibile e il tooltip inutilizzabile). Il nome è sempre visibile in un contenitore `flex-1 min-w-0` con span `group relative block min-w-0`, accanto compare il badge arancione "IN ATTESA" per chi non ha risposto alla domanda corrente, e il punteggio/"IN ATTESA DI INVIO" è in `shrink-0 whitespace-nowrap` così non comprime mai il nome.

```tsx
// Nel JSX, per la riga dello studente (struttura completa):
<button className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/30 hover:bg-muted/60 transition-colors text-left ${isExpanded && studentAnswers.length > 0 ? 'rounded-t-xl' : 'rounded-xl'}`}>
  {/* IN ATTESA — badge arancione a sinistra del nome */}
  {(pendingStudents as any[]).some((p: any) => p.id === student.id) && (
    <span className="text-[10px] font-bold text-orange-600 shrink-0">IN ATTESA</span>
  )}
  {/* Hotspot grigio */}
  <div className="size-2 rounded-full shrink-0 bg-gray-300" />
  {/* Nome — sempre visibile con tooltip nero (hover desktop + tap touch) */}
  <div className="flex-1 min-w-0">
    <span className="group relative block min-w-0 font-bold text-sm text-foreground text-center cursor-pointer"
      onClick={(e: any) => {
        if (window.matchMedia('(hover: none)').matches) {
          e.stopPropagation();
          setTooltipStudent(tooltipStudent === student.id ? null : student.id);
        }
      }}>
      <span className="block truncate">{student.name}</span>
      <span className={`pointer-events-none absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 max-w-[85vw] rounded-md bg-black px-3 py-1.5 text-xs text-white shadow-lg transition-opacity duration-150 ${tooltipStudent === student.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100"}`}>
        {student.name}
      </span>
    </span>
  </div>
  {/* Punteggio o IN ATTESA DI INVIO — non comprime il nome */}
  <div className={`text-xs sm:text-sm font-bold shrink-0 whitespace-nowrap ${hasAnsweredCurrent ? scoreColor(correctAnswers) : 'text-orange-500'}`}>
    {hasAnsweredCurrent ? correctAnswers + '/10' : 'IN ATTESA DI INVIO'}
  </div>
  {/* Pulsante rimozione + chevron espansione */}
  <div className="flex items-center gap-0.5 shrink-0">
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveStudent(student.id); }} disabled={removeStudentMutation.isPending} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-1.5 h-7" title="Rimuovi lo studente">
      <XCircle className="size-4" />
    </Button>
    {studentAnswers.length > 0 && (
      <div className="text-muted-foreground ml-0.5">
        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </div>
    )}
  </div>
</button>
```

**Regole chiave del layout (non rompere):**
- Il contenitore del nome DEVE essere `flex-1 min-w-0` (occupa lo spazio disponibile) e lo span nome DEVE essere `block min-w-0` con `truncate` — così il nome resta sempre visibile (troncato con ellipsis se manca spazio, mai invisibile).
- Il badge "IN ATTESA" usa `pendingStudents` (array già calcolato: studenti attivi che NON hanno risposto alla domanda corrente).
- "IN ATTESA DI INVIO" è `text-orange-500` (prima era `text-amber-600`).
- Niente `grid grid-cols-[auto_1fr_auto]` nella riga studente: con la scritta lunga "IN ATTESA DI INVIO" la colonna centrale (1fr) collassava e il nome spariva (bug segnalato dall'utente con foto).

**Comportamento:**

| Situazione | `hasAnsweredCurrent` | Mostra |
|-----------|---------------------|--------|
| Docente NON ha ancora avviato alcuna domanda | `false` (fallback: `studentAnswers.length > 0`) | Score se lo studente ha risposte pregresse, altrimenti IN ATTESA DI INVIO |
| Docente AVVIA domanda N, studente NON risponde | `false` | **IN ATTESA DI INVIO** (ambra) |
| Studente RISPONDE alla domanda N | `true` | `correctAnswers + '/10'` (verde/rosso in base a scoreColor) |
| Docente AVANZA a domanda N+1, studente non ancora risposto | `false` | **IN ATTESA DI INVIO** |
| Studente risponde alla domanda N+1 | `true` | Score aggiornato |

**Nota:** La condizione per mostrare il chevron/expand rimane `studentAnswers.length > 0` (indipendente dalla domanda corrente — lo studente può espandere per vedere tutte le risposte date).

**Cosa NON fare:**
- NON controllare `studentAnswers.length === 10` (logica vecchia — mostrava score solo quando tutte le 10 domande erano risposte)
- NON controllare `studentAnswers.length > 0` (logica vecchia — mostrava score appena lo studente rispondeva alla prima domanda)

### 14. Dropdown risposte — risposta corretta in verde dopo la freccia

**File:** TeacherPage.tsx (root + client/src/pages/)

Il dropdown espanso mostra ogni risposta dello studente in questo formato:

```
# ✅/❌ risposta_dello_studente  (se errata: → risposta_corretta_in_verde)
```

**Codice completo (dentro `{isExpanded && studentAnswers.length > 0 && (...)}`):**

```tsx
<div key={answer.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/50">
  <span className="text-xs text-muted-foreground font-mono w-4 shrink-0 text-center">#</span>
  {answer.isCorrect
    ? <CheckCircle2 className="size-4 text-green-600 shrink-0" />
    : <XCircle className="size-4 text-red-500 shrink-0" />}
  <span className={answer.isCorrect ? "text-sm text-green-600" : "text-sm text-red-500"}>{answer.selectedAnswer}</span>
  {!answer.isCorrect && (
    <><span className="text-xs text-muted-foreground">→ </span><span className="text-sm text-green-600">{correctAns}</span></>
  )}
</div>
```

Dove `correctAns` proviene da:
```tsx
const { data: shakespeareQuestions } = trpc.questions.listWithAnswers.useQuery();  // ← ATTENZIONE: listWithAnswers, NON list!
// ...
const qData = shakespeareQuestions?.find((q: any) => q.number === answer.questionNumber);
const correctAns = qData?.correctAnswer || '';
```

### 15. API CRITICO — questions.list vs questions.listWithAnswers

**Endpoint server (server/routers.ts):**

```typescript
// Per studenti: SOLO numero, domanda e opzioni (SENZA risposta corretta)
list: publicProcedure.query(() => {
  return SHAKESPEARE_QUESTIONS.map(q => ({
    number: q.number,
    question: q.question,
    options: q.options,
  }));
}),

// Per docenti: DATI COMPLETI con correctAnswer
listWithAnswers: publicProcedure.query(() => {
  return SHAKESPEARE_QUESTIONS;
}),
```

**Regola:**
- `StudentQuiz.tsx` → usa `trpc.questions.list.useQuery()` (NON serve correctAnswer) ✅
- `TeacherPage.tsx` → usa `trpc.questions.listWithAnswers.useQuery()` (SERVE correctAnswer per dropdown e PDF) ✅
- `reportPdf.ts` → usa `questionsWithAnswers` (passato da TeacherPage) ✅

**SINTOMO se si usa l'API sbagliata:**
- La risposta corretta in verde dopo la freccia `→` NON compare (corretta invisibile)
- Il PDF report mostra "Risposta corretta: " vuoto

**Diagnosi rapida:** Cercare `trpc.questions.list.useQuery()` in TeacherPage.tsx — se presente, CAMBIARE in `trpc.questions.listWithAnswers.useQuery()`.

### 16. Footer REALIZZATO DA ANDREA CENTINARO — RIMOSSO DA TUTTE LE PAGINE

**File:** Home.tsx, TeacherPage.tsx, StudentQuiz.tsx (root + client/src/pages/)

**Stato attuale (dal 2026-09-03):** Il footer "Realizzato da Andrea Centinaro" è stato RIMOSSO da TUTTE le pagine (homepage, area docente, schermate studente), allineandosi all'app sorgente LATINO-FACILE-APPLICAZIONE che non lo mostra.

**Dove era (ORA RIMOSSO):**
1. `Home.tsx` — homepage studente (footer a fine pagina, con commento `{/* Footer */}`)
2. `TeacherPage.tsx` — dashboard docente, in entrambi i mirror (root e client/src/pages/), footer con commento `{/* DOWNBAR */}`
3. `StudentQuiz.tsx` — schermate studente (d'attesa e quiz) già rimosse in precedenza

**Attenzione:** `ComponentShowcase.tsx` contiene un `<footer>` di sola demo ("Shadcn/ui Component Showcase") non instradato nell'app: NON contiene la scritta e non va toccato.

### 17. QUESTION N — testo domanda nascosto nel lato studente

**File:** StudentQuiz.tsx (root + client/src/pages/)

**Richiesta docente:** Nel lato studente, al posto del testo della domanda (es. "WHERE WAS WILLIAM SHAKESPEARE BORN?") mostrare solo "QUESTION 1", "QUESTION 2", ... "QUESTION 10". Il lato docente (TeacherPage.tsx) NON deve essere toccato — continua a mostrare il testo completo.

**Prima (nel blocco `{currentQ ? (...)}` a ~linea 408-416):**
```tsx
<div className="text-center">
  <p className="text-xs text-muted-foreground tracking-widest mb-2">DOMANDA {currentQNum}</p>
  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
    {currentQ.question}
  </h2>
</div>
```

**Dopo:**
```tsx
<div className="text-center">
  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
    QUESTION {currentQNum}
  </h2>
</div>
```

**Note chiave:**
- `currentQNum` è la variabile già esistente (numero della domanda corrente 1-10) — NON serve inventare nulla
- Il label piccolo "DOMANDA {currentQNum}" va RIMOSSO (ridondante con "QUESTION N")
- `currentQ` (l'oggetto domanda) resta usato per le `options` e per `currentQ.number` — rimuovere SOLO `{currentQ.question}` dal titolo
- Il campo `question` resta nell'array `questions` (usato dal lato docente e dal PDF) — NON cancellarlo dal server
- Applicare SEMPRE a entrambi i mirror e verificare con `diff` che i file siano identici

**Verifica rapida:** `grep -n "currentQ.question" StudentQuiz.tsx client/src/pages/StudentQuiz.tsx` → deve restituire ZERO risultati. Il testo "DOMANDA " non deve comparire più nel lato studente.

### 18. PRIMA PAGINA (Home) — margini pareggiati come LATINO-FACILE (lf-welcome)

**File:** `client/src/pages/Home.tsx` + `client/src/index.css` (NON esistono mirror root di Home.tsx)

**Richiesta (dal 2026-09-03):** I margini della prima pagina (Home studente) devono essere pareggiati esattamente come nell'app LATINO-FACILE-APPLICAZIONE (vedi tabella "margini_prima_pagina.png"): niente vuoto enorme sopra la card, 24px tra la barra di accessibilità e il contenuto e 24px simmetrici sotto la card, cornice iframe che si RESTRINGE al contenuto.

**Cosa è stato fatto (identico al pattern LATINO-FACILE):**
1. `Home.tsx`: la root ha ora la classe `lf-welcome` e NON ha più `min-h-screen`/`flex-1`/`pb-16` — struttura compatta `lf-welcome flex flex-col items-center bg-background paper-grain px-4 pb-8 sm:pb-12` > `div:first-child flex w-full flex-col items-center pt-4 sm:pt-8` > header (titolo + Area docente) > card.
2. `Home.tsx`: `useEffect` che in VISTA AUTONOMA (`window.self === window.top`) aggiunge su `<html>` la classe `lf-welcome-top` (rimossa al cleanup). Dentro l'iframe NON viene aggiunta.
3. `index.css` (sezione dopo le regole EMBED):
   - `html.lf-embedded .lf-welcome`: `min-height: 0 !important; padding-top: 20px; padding-bottom: 24px` → la barra ha già `mb-1` (4px): 20+4 = **24px sopra** il contenuto e **24px sotto** la card (simmetrici).
   - `html.lf-embedded .lf-welcome > div:first-child`: `padding-top: 0 !important` (annulla il pt-4/8 dentro la cornice).
   - `html.lf-welcome-top body`: `background-color: #ffffff` + `.lf-welcome { position: relative }` + `::after` gradiente crema→bianco (48px) in fondo: la pagina "termina" subito sotto la card anche da sola nel browser.

**Numeri verificati (console):** dentro l'iframe `htmlClasses = lf-embedded`, `padding-top 20px`, `padding-bottom 24px`, gap barra→titolo = 24px, gap card→fine = 24px, `docScrollHeight` ~679px inviato alla cornice (nessun 640 fisso). In vista autonoma `htmlClasses = lf-welcome-top`.

**NON toccare:** StudentQuiz usa ancora `min-h-screen` — dentro l'iframe la regola globale `html.lf-embedded .min-h-screen { min-height: 0 !important }` lo fa seguire il contenuto (è già attiva).

**⚠️ NOTA (fix 2026-09-03):** la TeacherPage NON è più coperta dalla sola regola globale `min-h-screen`: la sua card ha `max-h-[92vh]` + classi semantiche `lf-docente`/`lf-docente-card`/`lf-docente-body` con regole EMBED dedicate (vedi sezione 21). NON ripristinare `h-[92vh]` fisso sulla card docente e NON rimuovere le regole `html.lf-embedded .lf-docente-*`.

### 19. CORNICE DINAMICA per Blogger (cartella cornice-dinamica/) — come in LATINO-FACILE

**Richiesta (dal 2026-09-03):** Aggiornare la cornice dinamica del QUIZ replicando quella dell'app LATINO-FACILE-APPLICAZIONE (repo `cornice-dinamica/`): embed a ALTEZZA AUTOMATICA da incollare in Blogger con titolo, pulsanti Schermo intero/Ricarica, spinner, stato online/errore, v3 IMPERMEABILE (id univoci con token, scoping `document.currentScript`, filtro `e.source`, CSS scoped `.lf-cornice`) e ANTI-LOOP.

**Dove (NEL PROGETTO, cartella a root):** `/home/user/shakespeare-quiz/cornice-dinamica/`

**File generati (identici nel pattern alla repo LATINO-FACILE, adattati al quiz):**
- `embed-shakespeare-quiz-dedicata.html` ⭐ (~19 KB, v3 impermeabile + anti-loop, consigliata): `APP_URL = https://shakespeare-quiz.easy-peasy.site/`, titolo "QUIZ INTERATTIVO", palette plum/gold del quiz (carta `#f5f0e5`, inchiostro `#2e2118`, plum `#a85838`, gold `#be8e4f`, barra `#fdfcf8`, capsula `#ede9e1`, bordo-capsula `#dad7d2`).
- `embed-shakespeare-quiz-lite.html` (~5 KB, riutilizzabile con `?app=`)
- `embed-universale.html` (template con URL segnaposto per altre app)
- `embed-shakespeare-quiz.html` (~125 KB, AUTOSUFFICIENTE: font OpenDyslexic in base64)
- `test-dedicata.html` e `test-impermeabile.html` (simulano il blog: 2 cornici + intruso)
- `fonts/` (OpenDyslexic `-v2.woff2` e copie senza suffisso) e `README.md`

**Modifiche lato APP necessarie (già fatte):**
1. `client/index.html`: RIMOSSO lo script legacy inline di auto-resize — era il bug dell'altezza "gonfiata" (usava `documentElement.scrollHeight` come riferimento assoluto e la cornice non poteva MAI restringersi). Ora l'altezza è gestita SOLO da `client/src/lib/heightSync.ts` (inizializzato in `main.tsx`), come in LATINO-FACILE.
2. `server/_core/index.ts`: aggiunto middleware CORS per `/fonts` (`Access-Control-Allow-Origin: *`) così la cornice su Blogger carica gli OpenDyslexic cross-origin da `/fonts/OpenDyslexic-*-v2.woff2`.

**Controlli dopo un intervento sulla cornice:**
- `grep -rni "latino" cornice-dinamica/` → deve restituire ZERO (nessun residuo dell'app di riferimento).
- Verifica live (sviluppo): copia la cartella in `client/public/cornice-dinamica/` e apri `/cornice-dinamica/test-impermeabile.html` nel preview → esito atteso: 2 cornici con id univoci (`lfCornice-...`), iframe 1/2 con altezza dinamica (non 9999), `iframe con altezza falsa 9999: 0`. Poi RIMUOVI la copia da `client/public/` (canonica resta a root).
- Ricorda: serve il deploy produzione con il nuovo server CORS perché i font della cornice vengano serviti con header corretto (in locale il dev server li serve già con CORS).

### 20. ACCESSIBILITÀ E INCLUSIVITÀ (pacchetto LATINO-FACILE) — barra 5 moduli + TTS + OpenDyslexic

**Richiesta (dal 2026-09-03):** Integrare TUTTE le funzionalità di accessibilità/inclusività dell'app di riferimento LATINO-FACILE-APPLICAZIONE (pacchetto ACCESSIBILITA.md) SENZA rimuovere funzionalità esistenti dell'app.

**⚠️ NIENTE MIRROR:** i file di accessibilità NON hanno copie a root — esistono SOLO in `client/src/` (a differenza di TeacherPage/StudentQuiz/reportPdf). Modificare UNA sola copia.

**File coinvolti (tutti in `client/src/`):**

| File | Ruolo |
|------|-------|
| `contexts/AccessibilityContext.tsx` | Stato globale accessibilità + persistenza localStorage (`sq_access`) + applicazione CSS |
| `components/AccessibilityToolbar.tsx` | Barra accessibilità UI (5 moduli: FONT, INTERLINEA, RIGHELLO, MODALITÀ, ASCOLTO) |
| `hooks/useReadAloud.ts` | Lettura ad alta voce (Web Speech API, `speechSynthesis`) |
| `lib/heightSync.ts` | Altezza dinamica per embed iframe (protocollo `labvisivo:height`) |
| `App.tsx` | `AccessibilityProvider` + `AccessibilityToolbar` globali (barra visibile su TUTTE le pagine: `/`, `/docente`, `/quiz`) |
| `main.tsx` | Chiama `initHeightSync()` prima del render |
| `index.css` | Font-face OpenDyslexic, variabili `--lf-scale`/`--lf-lh`, classi `lf-ruler`/`lf-hc`/`lf-embedded`/`lf-welcome-top`, `prefers-reduced-motion` |

**Barra accessibilità — 5 moduli (AccessibilityToolbar.tsx):**

| Modulo | Icona lucide | Controllo | Intervallo |
|--------|-------------|-----------|-----------|
| FONT | `Type` | A− / percentuale / A+ | scala 0.8–1.6 (step 0.1, `root.style.fontSize = 16×scala px`) |
| INTERLINEA | `AlignJustify` | ciclo valori | 1.5 → 1.65 → 1.9 → 2.2 → 2.6 |
| RIGHELLO | `Ruler` | ON/OFF (banda che segue il mouse) | toggle |
| MODALITÀ | `Contrast` | Normale / Contrasto | toggle (`lf-hc`) |
| ASCOLTO | `Volume2` | Leggi / Stop (TTS) | `aria-pressed` su `readAloud.speaking` |

**AccessibilityContext.tsx — dettagli:**
- `STORAGE_KEY = "sq_access"`, salva/rilegge `{ fontScale, lineHeight, ruler, mode }` (JSON in localStorage).
- `LINE_HEIGHTS = [1.5, 1.65, 1.9, 2.2, 2.6]`; `MIN_SCALE = 0.8`, `MAX_SCALE = 1.6`. 1.5 = interlinea "neutra" (aspetto attuale invariato).
- Applica su `<html>`: `fontSize = 16*fontScale px`, `--lf-scale`, `--lf-lh`, classi `lf-ruler` (se ruler) e `lf-hc` (se mode=contrasto).
- Righello: `mousemove` listener aggiorna `top` della banda `#band` (banda di lettura centrata sul puntatore).

**useReadAloud.ts — lettura ad alta voce (DSA/BES):**
- Usa `speechSynthesis`; sceglie la voce italiana migliore con punteggio (Google/Microsoft/Apple +4, natural/neural/premium/online +5, nomi italiani Elsa/Diego/Isabella ecc. +2, `localService` +1).
- Legge TUTTA la pagina (header + contenuto), NON solo `<main>`.
- ⚠️ DIVERGENZA DAL RIFERIMENTO: qui le OPZIONI DI RISPOSTA sono `<button>`, quindi NON escludere i pulsanti dalla lettura (altrimenti le risposte non verrebbero lette). Esclude solo toolbar, canvas, svg, script.
- MAIUSCOLE → minuscole (i TTS leggono le parole tutte maiuscole con accenti sbagliati/lettera per lettera).
- Date naturali: "01/09/2026" → "primo settembre duemilaventisei" (funzioni `integerToItalian`, numeri 0–999.999).
- Legge anche etichette e valori dei campi di input (Cognome, Nome, Codice).

**♿ Misure screen reader (misura 2.2-bis del pacchetto) nella toolbar:**
1. Icone lucide decorative → `aria-hidden="true"` (lucide NON lo mette di default).
2. Ogni capsula è `role="group"` con `aria-label` ("Font: dimensione del testo", "Ascolto: lettura ad alta voce"...). La barra è `role="toolbar"` con `aria-label`.
3. Pulsante ASCOLTO: il nome accessibile contiene la parola "Ascolto" ("Ascolto: leggi il testo ad alta voce" / "Ascolto: interrompi la lettura") + `aria-pressed` per lo stato.
4. Descrizione introduttiva `sr-only` all'inizio della barra (lettura in modalità browse).
5. Live region `role="status" aria-live="polite"` `sr-only`: dopo 800 ms annuncia "Barra di accessibilità disponibile. Usa il pulsante Ascolto per la lettura ad alta voce".
- Focus visibile: `focus-visible:outline-3 focus-visible:outline-[#b71c1c]` sui pulsanti.

**Font OpenDyslexic:**
- `client/public/fonts/`: `OpenDyslexic-Regular.ttf`, `OpenDyslexic-Bold.ttf`, `OpenDyslexic-Italic.otf`, `OpenDyslexic-Bold.otf` + varianti `.woff2`/`-v2.woff2`. Nella build finiscono in `/fonts/` (public).
- `index.css`: 4 `@font-face` `font-family: "OpenDyslexic"` (Regular/Bold/Italic/ Bold) da `/fonts/...` + regole che applicano `OpenDyslexic, Cambria, Georgia, "Times New Roman", serif !important` (es. sotto `lf-hc`, e la regola base con `font-size: calc(16px * var(--lf-scale, 1))` e `line-height: var(--lf-lh, 1.5)`).
- Il server serve `/fonts` con CORS (`server/_core/index.ts`, vedi sezione 19) perché la cornice su Blogger carichi i font cross-origin.

**CSS accessibilità/embed in index.css (non rompere):**
- `html.lf-ruler .lf-ruler-band` — banda di lettura visibile solo con classe `lf-ruler` su `<html>`.
- `html.lf-hc` — alto contrasto: regole su `body`, `.paper-grain`, `.bg-card`, `.bg-popover` (sfondi neutri → contrasto, font OpenDyslexic `!important`).
- `@media (prefers-reduced-motion: reduce)` — disattiva animazioni.
- EMBED: `html.lf-embedded .min-h-screen, html.lf-embedded .min-h-dvh { min-height: 0 !important }` (aggiunta da heightSync quando dentro iframe) + `html.lf-embedded body` e regole `lf-welcome` (sez. 18) → la pagina segue il contenuto e l'iframe può restringersi.

**heightSync.ts — protocollo `labvisivo:height` (embed):**
- Attivo SOLO dentro iframe (`window.self !== window.top`): aggiunge `lf-embedded` su `<html>`.
- `currentHeight()`: max di `body.scrollHeight`, `body.offsetHeight`, `docEl.offsetHeight` e — se `docEl.scrollHeight > viewportH` — `docEl.scrollHeight`.
- Invia `{ type: "labvisivo:height", height, cornice? }` (token letto da `?cornice=` nella URL) se `height > 100`.
- Ascolta `labvisivo:ping` dal parent e risponde con l'altezza (specchia il token del ping).
- Reinvia su: `load`, `resize`, `ResizeObserver` su `documentElement`+`body`, e a 250/500/1500 ms.
- Vedere sezione 19 per la cornice dinamica (lato blog) che riceve questi messaggi.

### 21. FIX ALLUNGAMENTO PAGINA DOCENTE in embed/iframe (2026-09-03)

**Sintomo segnalato dall'utente:** "l'app o la cornice dinamica si allunga indebitamente" — foto della pagina `/docente` con card altissima e area destra vuota, dentro la cornice del blog.

**Causa (misurata):** la card della dashboard docente aveva altezza FISSA `h-[92vh]` (92% del viewport). Dentro l'iframe a altezza automatica della cornice dinamica si creava un CICLO: l'app misura l'altezza → il 92vh dipende dall'altezza corrente dell'iframe → la cornice cresce → il 92vh cresce ancora → l'altezza misurata cresce di nuovo… all'infinito. Misure del bug: pagina `/docente` in iframe → 1169 px a larghezza 900, 2019 px a larghezza 423 (invece di fermarsi al contenuto). Anche in vista autonoma la card `h-[92vh]` riempiva sempre il 92% della finestra anche con poco contenuto.

**Correzione applicata (2 livelli):**

1. **Nell'iframe (embed)** — la card segue il CONTENUTO reale, niente più 92vh e niente scroll interni che ingannano la misura. Aggiunte classi semantiche in `TeacherPage.tsx` (root + client/src/pages/ — sono MIRROR, aggiornarli entrambi):
   - wrapper: `lf-docente`
   - card: `lf-docente-card`
   - middle row: `lf-docente-body`
   E in `client/src/index.css` (UNICA copia, niente mirror):
   ```css
   html.lf-embedded .lf-docente { height:auto !important; min-height:0 !important; padding-bottom:0 !important; }
   html.lf-embedded .lf-docente-card { height:auto !important; max-height:none !important; min-height:0 !important; overflow:visible !important; }
   html.lf-embedded .lf-docente-body { height:auto !important; min-height:0 !important; overflow:visible !important; }
   html.lf-embedded .lf-docente-body > aside,
   html.lf-embedded .lf-docente-body > main { height:auto !important; overflow:visible !important; }
   ```
2. **In vista autonoma (fuori iframe)** — card `h-[92vh]` → `max-h-[92vh]` + `min-h-0` sul body: la card è alta quanto il contenuto (minimo 580px da `min-h-[580px]`) e si ferma al 92% SOLO quando il contenuto è davvero tanto, con scroll interno delle colonne.

**Numeri verificati dopo il fix (produzione):** pagina docente in iframe → w900 **769 px stabili** (prima 1169), w423 **1313 px stabili** (prima 2019; su mobile il contenuto è impilato, quindi più alto ma FISSO, non in crescita). Sequenze altezze: `721,721,721,769,769,769` (converge e resta ferma). Home in iframe invariata (641 px). Card docente standalone 1280 px: 675 px di contenuto (prima 736 fissi). Cornice completa su "Blogger": ~739 px compatti desktop e mobile.

**Come verificare:** `verify.js` in `/home/user/pwtest/` misura la SEQUENZA di altezze inviate dall'app in un iframe: deve CONVERGERE e restare ferma (non crescere all'infinito).

**Regole d'oro per il futuro:**
- In una pagina che può essere embeddata NON usare `h-[NNvh]` fisso su contenitori (crea loop con heightSync). Usare `max-h-[NNvh]` + contenuto naturale, oppure regole `html.lf-embedded` che azzerano le altezze fisse.
- Mantenere le classi semantiche `lf-docente*` (o equivalenti `lf-*`) perché le regole embed le bersagliano.
- I mirror root di TeacherPage vanno SEMPRE aggiornati insieme a `client/src/pages/TeacherPage.tsx`.

### 22. RIFINITURA UI DOCENTE in embed: doppione IN ATTESA, pulsanti dentro i bordi, header responsive (2026-09-04)

**Sintomo segnalato dall'utente (3 foto, 2026-09-04 ~01:01):** nella dashboard docente vista dentro la cornice del blog su mobile: (a) ogni riga studente mostrava DUE stati quasi identici — arancione `IN ATTESA` a sinistra e `IN ATTESA DI INVIO` a destra, separati da un pallino grigio — e il NOME dello studente non era leggibile (schiacciato a larghezza zero dai due testi nowrap); (b) i pulsantini rossi X (rimuovi studente) uscivano dal bordo destro della card; (c) il link `Area studenti` nell'header sbordava dal bordo destro della card su viewport stretti (~360–390 px).

**Cause (misurate):** (a) nella riga studente c'erano DUE etichette di stato: un testo arancione `IN ATTESA` a sinistra del nome + l'etichetta destra `IN ATTESA DI INVIO` (calcolata su `pendingStudents`, blocco poi rimosso perché inutilizzato); (b) la card studenti aveva `p-10 sm:p-12` (40 px di padding anche su mobile) e i contenuti nowrap spingevano le X verso/oltre il bordo; (c) l'header docente era `flex items-center justify-between` ma il contenitore del titolo NON aveva `min-w-0`: su larghezze strette il titolo non si restringeva e il flex spingeva il link `Area studenti` oltre il bordo destro della card (misurato: card 12→348, link fino a 362 a 360 px).

**Correzioni applicate (TeacherPage.tsx root + client/src/pages/ — MIRROR, aggiornati entrambi):**

1. **Doppione IN ATTESA rimosso** — eliminata l'etichetta arancione a sinistra e il memo `pendingStudents` inutilizzato: ogni riga mostra ora UN solo stato a destra (`IN ATTESA DI INVIO` se non ha risposto alla domanda corrente, altrimenti il punteggio `n/10` colorato). Il nome (ora leggibile) è nel `flex-1 min-w-0 truncate` centrale, con tooltip touch per il nome completo.
2. **Padding card studenti** — `CardContent` da `p-10 sm:p-12` a `p-4 sm:p-12`: su mobile i bordi delle righe (e le X) restano dentro la card.
3. **Header responsive** — il wrapper dell'header è ora `flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`; il contenitore del titolo ha `min-w-0`; il link `Area studenti` ha `w-fit shrink-0`. Su mobile (<640 px): titolo su una riga intera e link sotto, tutto dentro la card. Da `sm` in su: titolo a sinistra e link a destra sulla stessa riga (come prima).

**Numeri verificati dal vivo (preview, iframe con protocollo `labvisivo:height`, classe reale 3A VERIFICA con 2 studenti):**

| Vista | Larghezza | Altezza stabile (applicata = doc reale = iframe) |
|---|---|---|
| Home studente (embed) | 860 px | 641 px — stabile |
| Home studente (embed) | 360 px | 682 px — stabile |
| Join quiz studente (embed) | 360 px | 728 px — stabile |
| Docente senza classe (embed) | 860 px | 769 px — stabile |
| Docente senza classe (embed) | 360 px | ~1379 px — stabile |
| Docente con classe attiva + 2 studenti | 480 px | 2205 px — stabile |
| Docente con classe attiva + 2 studenti | 360 px | 2375 px — stabile |

Nessuna sequenza in crescita (niente loop con heightSync). Righe studenti a 360 px: nomi leggibili per intero (`Mario ROSSI`, `Luca BIANCHI`), UN solo `IN ATTESA DI INVIO`, X a −36 px dentro la card. Link `Area studenti` a 360 px: −21 px dentro (dopo il fix 1) poi layout a colonna con titolo su una riga (h=23 px) e link sotto (−138 px). A 860 px header su una sola riga (titolo a sinistra, link a destra).

**Come verificare (riproducibile):** creare un file temporaneo in `client/public/` (es. `_misura-cornice.html`) che carica l'app in un iframe same-origin, applica le stesse protezioni anti-loop della cornice (debounce 200 ms, clamp 100–15000, congelamento dopo 3 crescite consecutive) e logga ogni `labvisivo:height` ricevuto + le metriche reali del documento (`scrollHeight`/`clientHeight` dell'iframe). Verificare che `altezza applicata = doc reale = altezza iframe` e che resti costante nel tempo a 360/480/640/860 px. RIMUOVERE il file da `client/public/` a fine test (non deve finire in produzione).

**Regole d'oro:**
- Header/pagine che possono essere embeddate: i contenitori flessibili con testo lungo devono avere `min-w-0` e il layout deve ripiegare a colonna sotto ~400 px; mai affidarsi allo shrink implicito del flex.
- I mirror root di TeacherPage vanno SEMPRE aggiornati insieme a `client/src/pages/TeacherPage.tsx` e verificati con `diff -q`.
- `pnpm check` (tsc) pulito dopo ogni modifica TSX.

### 23. CORNICE v4 + DASHBOARD NON TAGLIATA + PULSANTI DENTRO I BORDI (2026-09-04, 2ª tornata)

**Sintomi segnalati dall'utente (2 foto, 2026-09-04 ~08:46):** (a) sul telefono il pulsante `MOSTRA RISPOSTA ESATTA` (e nella card classe aperta: `ELIMINA CLASSE`, `QUIZ IN BIANCO PDF`) risultava ancora leggermente fuori dai bordi; (b) sul PC la dashboard docente vista nella cornice del blog era TAGLIATA in verticale: dopo `MOSTRA RISPOSTA ESATTA` compariva subito il piè di pagina del blog, senza barre di scorrimento e senza poter vedere il resto della dashboard; il lato studente andava ricontrollato allo stesso modo.

**Cause (misurate dal vivo in preview):**
1. **Dashboard tagliata su PC = la cornice NON applicava le crescite legittime di altezza.** La vecchia logica anti-loop della cornice aveva due euristiche diventate dannose: (a) «congelamento» dopo 3 crescite consecutive e (b) «conferma entro 2 s» dei salti > 2× e > 1000 px. Una pagina docente con classe aperta cresce LEGITTIMAMENTE da ~680 px (Home) a ~1700–2400 px; siccome l'app risponde ai ping ogni ~3 s, il valore grande non veniva MAI confermato entro 2 s → l'iframe restava basso → dashboard tagliata e non scrollabile. Misura: dopo la correzione la crescita 679→1682 px (e fino a 2433 px a 360 px) viene applicata e resta STABILE.
2. **Sforo orizzontale del `<main>` docente:** il main del flex (`flex-1 sm:overflow-y-auto`) NON aveva `min-w-0`; la colonna destra della dashboard non si restringeva sotto il suo min-content e usciva dal bordo destro della card (misurato a 800 px: main right = 821 px vs card right = 784 px → +37 px di sforo su TUTTI i contenuti: pulsanti, card classe, card studenti). Questo spiegava anche i pulsanti «fuori bordo» a certe larghezze (es. 640–800 px in cui sidebar e main sono affiancati).
3. **Pulsanti con `whitespace-nowrap` (default shadcn) e altezze fisse (`h-9/h-10/h-11/h-8`)** che, in colonne strette, non andavano a capo e spingevano oltre il bordo (in particolare la riga `‹ Domanda X/10 ›` con `min-w-[140px]` e i pulsanti lunghi `ELIMINA CLASSE`, `QUIZ IN BIANCO PDF`, `MOSTRA RISPOSTA ESATTA`).

**Correzioni applicate:**

1. **`cornice-dinamica/embed-shakespeare-quiz-dedicata.html` → logica altezza v4** (righe ~307–340): RIMOSSE le euristiche «congelamento dopo 3 crescite» e «conferma salti > 2×» (band-aid per il vecchio loop di feedback, ormai eliminato alla radice da CSS `lf-embedded` + niente transizione). Ora `applicaAltezza()` fa solo: clamp di sanità (100–15000) + **debounce 300 ms** (applica l'ultimo valore solo quando l'app smette di inviare, cioè a layout stabilizzato). Le altezze intermedie di una crescita legittima non vengono mai applicate (il timer si resetta) → niente scatti né loop, ma le pagine alte vengono finalmente applicate. Il commento nel file spiega il perché.
2. **`TeacherPage.tsx` (root + client/src/pages/ — MIRROR, aggiornati entrambi):** aggiunto `min-w-0` a `<main className="min-w-0 flex-1 sm:overflow-y-auto">`.
3. **`client/src/index.css`:** nelle regole embed (`html.lf-embedded .lf-docente-body > aside, main`) aggiunto `min-width: 0 !important;` con commento che spiega la misura 821 vs 784.
4. **Pulsanti wrap-safe (TeacherPage, mirror):** `CHIUDI`, `ELIMINA CLASSE`, `REPORT PDF`, `QUIZ IN BIANCO PDF` → `h-auto min-h-9 px-3 py-2 ... !whitespace-normal leading-tight text-center`; `AVVIA SESSIONE`/`TERMINA SESSIONE` → `h-auto min-h-8 px-3 py-1.5 ... !whitespace-normal`; `MOSTRA RISPOSTA ESATTA` → `h-auto min-h-10 px-4 py-2 ... !whitespace-normal leading-tight text-center max-w-full`; riga navigatore domande → `flex flex-wrap items-center justify-center gap-x-4 gap-y-2` con frecce `shrink-0` e contatore `min-w-[120px] sm:min-w-[140px]`. Il testo dei pulsanti ora va a capo dentro il pulsante invece di spingere fuori.

**Numeri verificati dal vivo (preview, CORNICE REALE embed-shakespeare-quiz-dedicata.html v4, classe 3A VERIFICA 5559 riaperta + sessione avviata):**

| Vista | Larghezza | Altezza iframe (= doc reale, stabile) | Overflow orizzontale rispetto alla card |
|---|---|---|---|
| Docente con classe aperta + sessione | 800 px | 1682 px | 0 px (prima +37 px sul main) |
| Docente con classe aperta + sessione | 640 px | 1999 px | ~0 (2 px di arrotondamento bordo) |
| Docente con classe aperta + sessione | 480 px | 2240 px | 0 px |
| Docente con classe aperta + sessione | 360 px | 2433 px | 0 px (tutti i 17 bottoni dentro) |
| Studenti: quiz domanda 1 in embed | 360 px | 834 px | 0 px |

Crescita 679→1682 px applicata correttamente (con la vecchia logica NON sarebbe mai stata confermata). Altezze stabili nel tempo (nessun drift).

**Pulizia database (LE TUE CLASSI):** il database è PostgreSQL CONDIVISO tra preview e produzione (stessa `DATABASE_URL` del progetto): eliminare classi in preview le elimina ANCHE in produzione (e viceversa). `students` e `answers` hanno `ON DELETE CASCADE` su `classes` → basta `DELETE FROM classes;` (eseguito via webdev_execute_sql il 2026-09-04: 4 classi + 7 studenti + 1 risposta rimossi). ATTENZIONE: tocca i dati reali dell'utente — eseguire solo su richiesta esplicita.

**Consegna all'utente:** il file `cornice-dinamica/embed-shakespeare-quiz-dedicata.html` aggiornato (v4) va RINCORSO nel post Blogger (sostituire l'intero contenuto nella vista HTML): la versione vecchia in blog ha ancora la logica che taglia la dashboard.

**Come verificare (riproducibile):** copiare la cornice reale in `client/public/_cornice-test.html` cambiando `APP_URL` con l'URL di preview, aprirla nel browser, poi (stessa origin) navigare l'iframe su `/docente?cornice=<token>` (token leggibile da `lf.src`), RIAPRIRE una classe con codice+password e misurare: `iframe.style.height` deve diventare ~1700–2400 px (uguale a `contentDocument.documentElement.scrollHeight`) e restare stabile; scandire `card.querySelectorAll('*')` per overflow `right > card.right` (deve essere 0). RIMUOVERE `_cornice-test.html` da `client/public/` a fine test.

**Regole d'oro:**
- Nei flex a due colonne embeddabili: SEMPRE `min-w-0` sui figli flessibili con contenuto lungo (il min-content altrimenti sfora il container).
- Pulsanti con testo lungo in UI embeddabili: mai `whitespace-nowrap` + altezza fissa; usare `h-auto min-h-*` + `!whitespace-normal leading-tight`.
- La cornice NON deve «proteggersi» con congelamenti/conferme: la protezione vera è a monte (CSS `lf-embedded`, niente 100vh, niente transizioni); la cornice applica solo clamp + debounce.
- I mirror root di TeacherPage vanno SEMPRE aggiornati insieme a `client/src/pages/TeacherPage.tsx` (verifica: `diff -q`), e `pnpm check` pulito.

### 24. PDF v2 — rifacimento report + quiz in OpenDyslexic su UNA facciata (2026-09-04)

**Richiesta utente:** rifare i 2 PDF scaricabili (report e quiz in bianco) in OpenDyslexic su una **sola facciata A4**: 10 domande + dati alunno + legenda, **SENZA** la sezione "RISPOSTE CORRETTE/INCORRETTE", con il simbolo **✔ (spunta verde scuro) / ✘ (rossa) subito a destra della lettera dell'opzione scelta** al posto della scritta "RISPOSTA DELL'ALUNNO" (e dei vecchi marker testuali V/X), interlinea 1.5 e font ≥ 14 pt. La documentazione completa del nuovo layout è nella **sezione 5 (v2)** di questa skill.

**Cosa è stato fatto (reportPdf.ts root + client/src/lib/ — mirror IDENTICI):**
1. Layout riscritto: font OpenDyslexic ≥ 14 pt (15 pt titoli/box), interlinea 1.5 con fattore scalato automaticamente 1.5→1.15 SOLO se un contenuto eccezionale non entra in una facciata (preflight reale `pickFactor` che disegna la pagina di prova).
2. REPORT: header (titolo, `Studente:`, `Classe/Data/Voto`), filetto dorato, 10 domande con opzioni in linea marcate con il **simbolo vettoriale ✔ verde scuro / ✘ rossa subito dopo la lettera** (composito indivisibile `lettera) + simbolo + testo`) e opzione esatta non scelta in verde, legenda, box PUNTEGGIO. Niente più sezioni RISPOSTE CORRETTE/INCORRETTE né RISPOSTA DELLO STUDENTE.
3. QUIZ IN BIANCO: campi COGNOME/NOME/CLASSE/DATA + filetto + 10 domande con **casella quadrata** accanto al numero (lo studente ci scrive la lettera) + box PUNTEGGIO. **Distanza casella→filetto: `y += 7.6` dopo il filetto** (la casella sale 5.78 mm sopra la baseline; con 4.3 sforava la linea — fix 2º giro, misura: 3.2 mm).
4. TeacherPage (mirror): gestione `async/await` + `toast.error` nei download (era sync senza catch).
5. **Simboli ✔/✘ VETTORIALI al posto dei marcatori testuali "V"/"X" (2º giro 2026-09-04):** i vecchi marker erano testo (`" V"`/`" X"`) aggiunto al testo dell'opzione. Ora la scelta è segnata da un simbolo DISEGNATO (`drawSymbol`) subito a destra della lettera, perché né OpenDyslexic né `times` hanno i glifi U+2714/U+2718: ✔ `GREEN_DARK` [14,92,36] se corretta, ✘ `RED` [190,40,40] se errata; box `SYMBOL_W` 4.8 mm; gap simmetrici `MARK_GAP_AFTER_LETTER`/`MARK_GAP_BEFORE_TEXT` = 1.7/1.7 mm; composito indivisibile in `buildOptionSegments`; legenda con simboli vettoriali in `buildLegendSegments`. Messa a punto finale della geometria (centratura nel box sul cap-height misurato ~3.6 mm a 14 pt: ✔ `[1.0,3.3]→[2.7,−2.9]` da `(x+0.35, y−3.85)` con miter; ✘ `x+0.55→x+4.15`, `y−0.7→y−3.7` con round) applicata prima al mirror root e poi allineata al client: i due mirror sono byte-identici (verifica `diff`).

**Bug critici trovati nei test e corretti (importante per il futuro):**
1. **`drawInline` accavallava le domande:** ritornava la baseline dell'ULTIMA riga disegnata (`return y`) invece della riga SUCCESSIVA (`return y + lineH`, come `drawWrapped`). Con le opzioni su una sola riga la domanda seguente partiva a +1.6 mm invece che a un'interlinea intera → 10 sovrapposizioni per pagina (misurate con `pdftotext -bbox`). Fix: `return y + lineH;` in ENTRAMBI i mirror.
2. **Filetto che tagliava la prima domanda:** lo spazio sotto il filetto era `y += 1.2` (report) / `y += 1` (quiz), ma l'ascesa dei glifi OpenDyslexic a 14 pt è ~3.8 mm → le lettere (es. il `?` di "born?") attraversavano la linea. Fix: `y += 4.3` nel report, ma **7.6 nel quiz in bianco** (la casella della domanda 1 sale 5.78 mm sopra la baseline: con 4.3 la casella sforava il filetto di ~0.1 mm; con 7.6 resta a 3.2 mm sotto). Applicato a entrambi i mirror.
3. Refuso nelle stime: "V = data corretta" → "V = risposta corretta" (funzioni estimate, codice morto ma da tenere coerente; nel testo corrente i marcatori sono i simboli vettoriali ✔/✘).

**Verifica eseguita (test Node in /home/user/pdf-test):** `pdffonts` conferma OpenDyslexic embedded (foundry UKWN, v2.001); 0 sovrapposizioni; report = 1 pagina per studente anche con nome lunghissimo; quiz = 1 pagina; interlinea mediana 20.7 pt ≈ 21 pt teorici (14 pt × 1.5 → fattore 1.5 mantenuto); `pnpm check` pulito; mirror `diff` identici. I file `__pdftmp_*.cjs` di test vanno SEMPRE rimossi dalla root prima dello ZIP.

### 25. Registro deploy + verifica finale 2026-09-04 (PDF v2 → simboli ✔/✘, fix quiz in bianco)

Riepilogo operativo dell'intera tornata PDF di questa chat (dettagli layout nelle sezioni 5 e 24):

| Voce | Valore |
|---|---|
| Deploy produzione — fix quiz in bianco (`y += 7.6`) | Deployment **6607** → https://shakespeare-quiz.easy-peasy.site |
| Deploy produzione — simboli ✔/✘ vettoriali | Deployment **6611** (friendly URL invariato) |
| Checkpoint codice | `f2d26b7` (simboli, mirror allineati) · `18b1e02` (housekeeping: rimosso `__pdftmp_run.cjs` dalla root) |
| Preview usata per il test live | URL sandbox corrente (es. https://3000-iik2cyg4gtl37kiejlk0r.sandbox.easy-peasy.ai) |
| Test live preview | `/docente` → RIAPRI una classe (es. 1A, codice 4508, password `Ronan2`) → click **REPORT PDF**: il download parte DIRETTO, NESSUN toast; console pulita (ignorare i warning di hydration "button in button" preesistenti). Il click su REPORT PDF NON genera toast: non è un bug |
| Cattura PDF dal vivo | I download del browser sandbox NON finiscono su disco: hook `URL.createObjectURL` → `fetch(blobUrl)` → base64 su `window.__pdfB64` per ispezionare il PDF generato dal vivo |
| Artefatti E2E | `/home/user/pdf-test/SYM-REPORT.pdf` (3 studenti: 10/10, 7/10, stress 1/10) · `SYM-QUIZ-BIANCO.pdf` · `E2E2-REPORT-PROD.pdf` + `E2E2-QUIZ-PROD.pdf` (generati coi FONT della produzione) · PNG di ispezione · runner preservati in `/home/user/pdf-test/runners/` |
| Verifica font | `pdffonts` elenca SEMPRE anche gli standard-14 jsPDF (Helvetica/Times, emb=no) nelle prime righe → cercare `OpenDyslexic ... emb yes` nelle righe successive, NON fermarsi a `head` (un head troncato sembra "font non embedded": falso negativo) |
| Verifica contenuto | Report = 1 pagina per studente (anche nome lunghissimo), quiz = 1 pagina, 0 sovrapposizioni, ✔ verde scuro / ✘ rossa subito dopo la lettera, opzione esatta non scelta in verde senza simbolo |
| ZIP finale | `/home/user/QUIZ-INTERATTIVO-SORGENTE-GITHUB.zip` (221 voci, ~2,2 MB) — esclusi node_modules/.git/dist/.env/`*.pdf`/`*.zip`/guide pesanti |

**Mirror interno delle skill (IMPORTANTE):** `/home/user/shakespeare-quiz/skills/` contiene le 3 skill TRACKATE in git (quiz-interattivo-sorgente, quiz-adapter, shakespeare-quiz): dopo ogni modifica in `/home/user/skills/` RISINCRONIZZARE le copie interne prima di creare lo ZIP (altrimenti il pacchetto esporta skill vecchie — successo il 2026-09-04: mirror interno era fermo alle 08:43 mentre la principale era alle 09:24) e salvare un checkpoint webdev. NOTA: `rsync` NON è installato nel sandbox → usare `cp -r`/`tar` o generare lo ZIP direttamente dalla repo col comando della sezione "Creare ZIP" (la repo contiene già `skills/`). Il runner di test `__pdftmp_run.cjs` è preservato in `/home/user/pdf-test/runners/` (ricrearlo a root solo per i test, poi rimuoverlo prima dello ZIP).

### 26. Audit pacchetto ZIP per agenti IA — allineamento a PDF v2 + Dockerfile funzionanti (2026-09-04)

Verifica "pacchetto funzionale all'IA" (REBUILD/ADATTARE/RENDER/ACCESSIBILITA/AGENTS + cornice dinamica):

- **PDF v2 nei documenti IA:** README/REBUILD/AGENTS/ADATTARE/GUIDA-SKILL descrivevano ancora il layout v1 (riquadro PUNTEGGIO "blu" a 1 riga, riassunto CORRETTE/INCORRETTE, `blockH`, `computeQuestionHeight`, scritta "RISPOSTA DELLO STUDENTE"). Aggiornati tutti alla realtà v2: OpenDyslexic ≥ 14 pt, interlinea 1.5, UNA facciata per studente, scelta marcata con **simboli vettoriali ✔/✘ subito dopo la lettera**, box PUNTEGGIO **PLUM a 2 righe** mai spezzato (preflight reale `pickFactor`), NIENTE sezioni CORRETTE/INCORRETTE né RISPOSTA DELLO STUDENTE.
- **Dockerfile (prima INCOERENTI/ROTTI):** non esisteva un `Dockerfile` a root mentre doc/compose lo citavano; `deploy/Dockerfile` e `deploy/Dockerfile.render` erano IDENTICI e "semplici" (si aspettavano `dist/` già buildata, ma `dist/` è gitignorata → il deploy Render come documentato sarebbe FALLITO). Ora:
  - `Dockerfile` (root, NUOVO) — build completo: `pnpm install` + `pnpm build` (vite → `dist/public`, esbuild → `dist/index.js`) + `deploy/docker-entrypoint.sh` (migrazioni `drizzle-kit push` all'avvio). Usato da `docker-compose` (`context: ..` + `dockerfile: Dockerfile`).
  - `deploy/Dockerfile` — stesso build completo (per `docker build -f deploy/Dockerfile .`).
  - `deploy/Dockerfile.render` — multi-stage VERO: stage build (`pnpm build`) → stage runtime (`pnpm install --prod` + `drizzle-kit`), referenziato da `render.yaml`. `dist/` NON va committata: la genera il container.
  - Aggiunto `.dockerignore` a root (esclude node_modules/.git/dist/.env/guide pesanti).
- **ACCESSIBILITA.md:** aggiunta riga nella tabella riepilogo + nuova sezione **1-bis "PDF scaricabili accessibili (report + quiz in bianco) — layout v2"** + item in checklist: PDF OpenDyslexic embedded ≥ 14 pt, UNA facciata, simboli (non solo colore), box PUNTEGGIO mai spezzato.
- **RENDER.md:** tabella file riscritta (3 Dockerfile + entrypoint + .dockerignore), avvertenza "tre Dockerfile tutti con build dal sorgente".
- **ADATTARE.md:** le 6 tipologie (MC 3-4 opzioni, VERO/FALSO, risposta breve, fill-in-the-blanks semplice/strutturato, abbinamento immagine-parola, riordino) erano già documentate; allineate le istruzioni PDF al layout v2 (niente "RISPOSTA DELLO STUDENTE", niente `blockH`).

## Skill correlate

- **quiz-adapter** (`/home/user/skills/quiz-adapter/`): Per CAMBIARE le domande del quiz (tema, numero, PDF). Usare QUELLA skill, non questa, per le modifiche al set di domande.
