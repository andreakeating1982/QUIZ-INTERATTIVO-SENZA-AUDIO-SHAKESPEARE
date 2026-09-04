# ♿ ACCESSIBILITÀ — Misure di accessibilità e inclusività (riusabili)

> **Sezione ben segnalata del pacchetto.** Qui sono ricapitolate **tutte** le misure che rendono
> questa app accessibile (DSA/BES/ipovisione/screen reader) e che possono essere **facilmente
> implementate su altre app simili** (quiz, schemi, mappe, esercizi) usando questa repository come
> riferimento. Le misure sono state portate dal pacchetto ACCESSIBILITA.md dell'app di riferimento
> **LATINO-FACILE-APPLICAZIONE** (github.com/andreakeating1982/LATINO-FACILE-APPLICAZIONE) e
> adattate alla palette plum/gold del QUIZ INTERATTIVO.

---

## 0. Sintesi (copiaincolla per altre app)

| Misura | File chiave in questa repo | Difficoltà porting |
|---|---|---|
| Font **OpenDyslexic** | `client/public/fonts/` + `@font-face` in `client/src/index.css` | Bassa (copiare cartella + CSS) |
| **Barra accessibilità** 5 moduli (FONT / INTERLINEA / RIGHELLO / MODALITÀ / ASCOLTO) | `client/src/components/AccessibilityToolbar.tsx` + `client/src/contexts/AccessibilityContext.tsx` | Media (adattare palette e icone) |
| **Lettura ad alta voce (TTS)** italiano | `client/src/hooks/useReadAloud.ts` | Media (voce, esclusioni, normalizzazioni) |
| **Screen reader** (misura 2.2-bis) | `AccessibilityToolbar.tsx` (aria-label, role, sr-only, live region) | Bassa (copiare i pattern) |
| **Focus visibile** | classi `focus-visible` nei pulsanti | Bassa |
| **`prefers-reduced-motion`** | `client/src/index.css` | Bassa |
| **Alto contrasto** | classe `lf-hc` su `<html>` + CSS | Bassa |
| **Banda di lettura (righello)** | classe `lf-ruler` + `AccessibilityContext` | Bassa |
| **Altezza dinamica embed** (iframe non taglia contenuto) | `client/src/lib/heightSync.ts` + classi `lf-embedded`/`lf-welcome` | Media (protocollo `labvisivo:height`) |
| **PDF accessibili (report + quiz in bianco)** | `reportPdf.ts` (+ mirror) | Media (riusare il layout v2) |
| **Cornice dinamica accessibile per Blogger** | cartella `cornice-dinamica/` | Bassa (incollare HTML) |
| **CORS font** per il blog | middleware `/fonts` in `server/_core/index.ts` | Bassa |

---

## 1. Font OpenDyslexic (alta leggibilità per DSA/BES/ipovisione)

- **File:** `client/public/fonts/` → `OpenDyslexic-Regular.ttf`, `OpenDyslexic-Bold.ttf`,
  `OpenDyslexic-Italic.otf`, `OpenDyslexic-Bold.otf` (+ varianti `.woff2` e `-v2.woff2`).
  Nella build finiscono in `/fonts/` (publicDir = `client/public`).
- **CSS** (`client/src/index.css`, in cima):
  ```css
  @font-face { font-family: "OpenDyslexic"; src: url("/fonts/OpenDyslexic-Regular.ttf") format("truetype"); }
  @font-face { font-family: "OpenDyslexic"; src: url("/fonts/OpenDyslexic-Bold.ttf") format("truetype"); }
  @font-face { font-family: "OpenDyslexic"; src: url("/fonts/OpenDyslexic-Italic.otf") format("opentype"); }
  @font-face { font-family: "OpenDyslexic"; src: url("/fonts/OpenDyslexic-Bold.otf") format("opentype"); }
  ```
  Regole base che applicano il font quando serve (es. sotto `html.lf-hc`) con stack:
  `"OpenDyslexic", Cambria, Georgia, "Times New Roman", serif !important` e
  `font-size: calc(16px * var(--lf-scale, 1)); line-height: var(--lf-lh, 1.5);`
- **CORS per il blog:** il server serve `/fonts` con `Access-Control-Allow-Origin: *`
  (`server/_core/index.ts`), così la cornice su Blogger può caricare
  `/fonts/OpenDyslexic-*-v2.woff2` cross-origin.

> **Porting:** copiare `client/public/fonts/` + i 4 `@font-face` + le regole `--lf-scale`/`--lf-lh`.

### 1-bis. PDF scaricabili accessibili (report + quiz in bianco) — layout v2

Anche i **PDF scaricabili** sono accessibili (DSA/BES/ipovisione): sono generati con **jsPDF** in
`reportPdf.ts` (+ mirror radice) e usano lo **stesso font OpenDyslexic** embedded via
`ensureFonts(doc, fontsBase)`, dimensione **≥ 14 pt** (15 pt per titoli e box PUNTEGGIO),
**interlinea 1.5** e **una sola facciata A4 per studente**.

- **Scelta marcata senza affidarsi al solo colore:** nel report la risposta dello studente è
  indicata da un **simbolo vettoriale** subito dopo la lettera dell'opzione — **✔ verde scuro**
  (corretta) o **✘ rossa** (errata) — e l'opzione esatta non scelta è in verde. I simboli sono
  DISEGNATI (grafica vettoriale, non testo) perché né OpenDyslexic né i font standard jsPDF
  contengono i glifi U+2714/U+2718: la legenda in fondo usa gli stessi simboli, così il significato
  non dipende dalla capacità di distinguere i colori.
- **Riquadro PUNTEGGIO mai spezzato:** 2 righe (`PUNTEGGIO: X/N` 15 pt bold PLUM +
  `Ogni risposta corretta vale 1 punto · Massimo N/N` 14 pt), bordo PLUM, sempre intero su UNA
  facciata grazie al **preflight reale** che disegna la pagina di prova e scala l'interlinea
  1.5→1.15 solo se serve (mai sotto 1.15).

> **Porting:** il layout è riusabile in qualunque app jsPDF: embed di OpenDyslexic, font ≥ 14 pt,
> interlinea 1.5, preflight 1 pagina, simboli vettoriali + legenda. Riferimenti completi:
> `skills/shakespeare-quiz/SKILL.md` sezioni 5 (5a–5h) e 24.

---

## 2. Barra accessibilità — 5 moduli (FONT / INTERLINEA / RIGHELLO / MODALITÀ / ASCOLTO)

Barra fissa visibile su **tutte le pagine** (`/`, `/docente`, `/quiz`): montata in `App.tsx` dentro
`AccessibilityProvider`, accanto a `TooltipProvider`.

| Modulo | Icona (lucide) | Controllo | Intervallo |
|---|---|---|---|
| FONT | `Type` | A− / percentuale / A+ | scala 0.8–1.6 (step 0.1) → `root.style.fontSize = 16×scala px` |
| INTERLINEA | `AlignJustify` | ciclo valori | 1.5 → 1.65 → 1.9 → 2.2 → 2.6 |
| RIGHELLO | `Ruler` | ON/OFF | banda di lettura che segue il mouse |
| MODALITÀ | `Contrast` | Normale / Contrasto | classe `lf-hc` su `<html>` |
| ASCOLTO | `Volume2` | Leggi / Stop | avvia/interrompe il TTS (stato `aria-pressed`) |

### File
- `client/src/contexts/AccessibilityContext.tsx` — stato globale + persistenza **localStorage**
  (`STORAGE_KEY = "sq_access"`), `LINE_HEIGHTS = [1.5,1.65,1.9,2.2,2.6]`, `MIN_SCALE=0.8`,
  `MAX_SCALE=1.6`; applica su `<html>` `fontSize`, `--lf-scale`, `--lf-lh`, classi `lf-ruler`/`lf-hc`;
  il righello aggiorna `top` della banda su `mousemove`.
- `client/src/components/AccessibilityToolbar.tsx` — la UI (icone lucide + `role`/`aria-label`).

> ⚠️ **File SENZA mirror:** esistono SOLO in `client/src/` (a differenza di TeacherPage/StudentQuiz).
> In altre app copiarli così come sono in `client/src/contexts|components|hooks`.

---

## 3. Lettura ad alta voce (TTS) — `useReadAloud.ts`

- Usa Web Speech API (`speechSynthesis`).
- Sceglie la **voce italiana migliore** con punteggio (Google/Microsoft/Apple +4,
  natural/neural/premium/online +5, voci italiane note +2, `localService` +1).
- Legge **tutta la pagina** (non solo `<main>`).
- ⚠️ **DIVERGENZA dal riferimento:** qui le opzioni di risposta sono `<button>`, quindi NON vanno
  escluse dalla lettura (altrimenti le risposte non verrebbero lette). Vanno esclusi solo toolbar,
  canvas, svg, script.
- Normalizzazioni: MAIUSCOLE → minuscole (i TTS leggono male le parole tutte maiuscole);
  **date naturali** ("01/09/2026" → "primo settembre duemilaventisei"); legge anche etichette/valori
  degli input (Cognome, Nome, Codice).

> **Porting:** copiare `useReadAloud.ts`; adattare l'elenco delle voci se serve; mantenere la regola
> di NON escludere i bottoni-risposta se le risposte sono `<button>`.

---

## 4. Misure screen reader (barra accessibilità) — misura 2.2-bis

1. **Icone decorative** → `aria-hidden="true"` (lucide non lo mette di default).
2. **Gruppi**: ogni capsula è `role="group"` con `aria-label` ("Font: dimensione del testo",
   "Ascolto: lettura ad alta voce"...); la barra è `role="toolbar"` con `aria-label`.
3. **Pulsante ASCOLTO**: nome accessibile con la parola "Ascolto" + `aria-pressed` per lo stato.
4. **Descrizione introduttiva** `sr-only` all'inizio della barra.
5. **Live region** `role="status" aria-live="polite"` (sr-only): annuncia dopo ~800 ms
   "Barra di accessibilità disponibile. Usa il pulsante Ascolto per la lettura ad alta voce".
6. **Focus visibile**: `focus-visible:outline-3 focus-visible:outline-[#b71c1c]`.

> **Porting:** copiare i 5 pattern — nessuna dipendenza dal tema (si usano le variabili Tailwind
> `bg-card`, `border-border`, `text-foreground`, `text-plum`… da adattare alla palette dell'app).

---

## 5. Alto contrasto, righello, riduzione movimento (CSS)

In `client/src/index.css`:

- `html.lf-hc` → regole di alto contrasto (`body`, `.paper-grain`, `.bg-card`, `.bg-popover`
  neutrali → contrasto; font OpenDyslexic `!important`).
- `html.lf-ruler .lf-ruler-band` → banda di lettura visibile SOLO con classe `lf-ruler` su `<html>`.
- `@media (prefers-reduced-motion: reduce)` → spegne animazioni/spinner.
- Variabili `:root`: `--lf-scale: 1; --lf-lh: 1.5;` usate per font-size e line-height globali.

---

## 6. Altezza dinamica per embed (iframe) — `heightSync.ts`

**Problema risolto:** quando l'app è dentro un iframe (blog/cornice), una pagina con `min-h-screen`
(100vh) forza l'iframe a un'altezza enorme con spazio vuoto sotto.

**Soluzione (protocollo `labvisivo:height`):**

1. `client/src/lib/heightSync.ts` (inizializzato in `main.tsx`, prima del render):
   - Se `window.self !== window.top` aggiunge `lf-embedded` su `<html>` → CSS:
     ```css
     html.lf-embedded .min-h-screen, html.lf-embedded .min-h-dvh { min-height: 0 !important; }
     ```
   - `currentHeight()` = max di `body.scrollHeight/offsetHeight`, `docEl.offsetHeight`, e se
     `docEl.scrollHeight > viewportH` anche `scrollHeight`.
   - Invia `{ type: "labvisivo:height", height, cornice? }` se `height > 100` (token letto da
     `?cornice=`).
   - Ascolta `labvisivo:ping` e risponde; reinvia su `load`, `resize`, `ResizeObserver` e ai
     timeout 250/500/1500 ms.
2. Prima pagina (`Home.tsx`): contenitore con classe `lf-welcome` e margini pareggiati
   (24px sopra/sotto, `lf-welcome-top` per la pagina autonoma) — vedi README sez. margini.
3. ⚠️ **Pagine DASHBOARD (es. `TeacherPage.tsx`)**: la sola regola `min-h-screen` NON basta se la
   card ha un'altezza fissa in viewport (`h-[92vh]`): dentro l'iframe a altezza automatica crea un
   CICLO di crescita (misurato: 1169px @900 / 2019px @423 invece del contenuto). Soluzione applicata
   (fix 2026-09-03): card con `max-h-[92vh]` (invece di `h-[92vh]`) + classi semantiche
   `lf-docente`/`lf-docente-card`/`lf-docente-body` e regole embed dedicate:
   ```css
   html.lf-embedded .lf-docente-card {
     height: auto !important; max-height: none !important;
     min-height: 0 !important; overflow: visible !important;
   }
   html.lf-embedded .lf-docente-body {
     height: auto !important; min-height: 0 !important; overflow: visible !important;
   }
   html.lf-embedded .lf-docente-body > aside,
   html.lf-embedded .lf-docente-body > main {
     height: auto !important; overflow: visible !important;
   }
   ```
   Risultato: la dashboard embeddata segue il contenuto (769px stabili @900, 1313 @423 mobile) e in
   autonoma non riempie più il 92% fisso della finestra (675px di contenuto a 1280×800).

> **Porting:** copiare `heightSync.ts`, chiamare `initHeightSync()` in `main.tsx`, e aggiungere le
> regole CSS `html.lf-embedded` per neutralizzare `min-h-screen` sul primo contenitore. Per pagine
> dashboard con card a viewport-height, sostituire `h-[92vh]` con `max-h-[92vh]` e aggiungere regole
> embed dedicate (pattern `lf-docente-*` qui sopra): MAI `h-[NNvh]` fisso su una pagina embeddata.

---

## 7. Cornice dinamica accessibile per Blogger — cartella `cornice-dinamica/`

La cornice (embed HTML autonomo) include:

- **Font OpenDyslexic** caricati con CORS dal dominio dell'app (`/fonts/OpenDyslexic-*-v2.woff2`).
- **Titolo e pulsanti sulla stessa riga**, centrati (accessibili: `<button>` con `aria-label`).
- **Spinner di caricamento** che rispetta `prefers-reduced-motion`.
- **Stato ONLINE / ERRORE** con `role="status" aria-live="polite"` e pulsante **Riprova**.
- **Altezza automatica** (protocollo `labvisivo:height` + anti-loop: debounce 200 ms, sanity
  100–15000 px, conferma salti sospetti >2× e >1000 px, congelamento dopo 3 crescite consecutive).
- **Impermeabile**: ogni cornice è un'isola (scoping con `currentScript`, token univoci, filtro
  `e.source` + token) — più cornici simili nella stessa pagina non si "rubano" i messaggi.
- **Schermo intero** (utile su LIM/proiettore): pulsante ⛶ con fallback se non supportato.

File principali: `embed-shakespeare-quiz-dedicata.html` (⭐ consigliata, v3 impermeabile + anti-loop),
`embed-shakespeare-quiz-lite.html`, `embed-universale.html`; test: `test-dedicata.html`,
`test-impermeabile.html`; fonts e `README.md` nella cartella.

> **Porting:** copiare la cartella e sostituire `APP_URL` (e, se serve, palette/titolo). Nessuna
> dipendenza dal codice dell'app oltre a `/fonts` con CORS e al protocollo `labvisivo:height`.

---

## 8. Checklist per rendere accessibile un'altra app simile

- [ ] Cartella `client/public/fonts/` con OpenDyslexic + 4 `@font-face` in `index.css`
- [ ] `--lf-scale` / `--lf-lh` e `font-size`/`line-height` globali su `<html>`
- [ ] `AccessibilityContext.tsx` + `AccessibilityToolbar.tsx` montati in `App.tsx` (tutte le pagine)
- [ ] `useReadAloud.ts` collegato al pulsante ASCOLTO
- [ ] Misure screen reader: icone `aria-hidden`, gruppi `role`, `aria-label`, `sr-only`, live region
- [ ] Focus visibile `focus-visible` ovunque
- [ ] `prefers-reduced-motion` per animazioni
- [ ] Modalità alto contrasto (`lf-hc`) e righello (`lf-ruler`)
- [ ] `heightSync.ts` + `main.tsx` + CSS `lf-embedded` (se l'app va embeddata)
- [ ] Server: middleware CORS per `/fonts`
- [ ] Cornice dinamica aggiornata nella cartella `cornice-dinamica/`
- [ ] PDF scaricabili accessibili: OpenDyslexic embedded ≥ 14 pt, interlinea 1.5, UNA facciata per
      studente, scelta marcata con simboli (non solo colore), box PUNTEGGIO mai spezzato
- [ ] Test: TTS legge le risposte, tab funziona, zoom testo non rompe il layout, PDF con font ad alta
      leggibilità

---

## 9. Riferimenti

- Repository di riferimento (misure originali):
  `https://github.com/andreakeating1982/LATINO-FACILE-APPLICAZIONE`
- App che già riusano queste misure: LATINO-FACILE, CORNICE UNIVERSALE, QUIZ INTERATTIVO (questa),
  e altre app didattiche della stessa famiglia (vedi README/skill).
- `AGENTS.md` (istruzioni IA), `REBUILD.md` (ricostruzione), `ADATTARE.md` (varianti), `RENDER.md`
  (deploy).
