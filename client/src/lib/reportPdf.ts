/**
 * Generates a downloadable PDF report for a class quiz session.
 *
 * 2026-09-04 — RIFATTO SU RICHIESTA (v2 PDF):
 *   • Font OpenDyslexic (Regular + Bold) embedded da /fonts (client/public/fonts),
 *     con fallback automatico su "times" se il fetch del font fallisce.
 *   • Tutto (titolo, dati alunno, 10 domande, legenda, box PUNTEGGIO) sta SEMPRE
 *     su UNA SOLA facciata A4 per studente: interlinea 1.5 (fatttore regolato in
 *     automatico 1.5→1.15 solo se un contenuto eccezionale non ci stesse).
 *   • Font minimo 14 pt su tutta la pagina.
 *   • REPORT: rimossa la sezione "RISPOSTE CORRETTE / INCORRETTE" e la scritta
 *     blu "RISPOSTA DELLO STUDENTE". Al suo posto: ✔/✘ subito dopo la LETTERA
 *     (V verde = corretta, X rossa = errata) e l'opzione esatta in verde.
 *   • QUIZ IN BIANCO: casella quadrata accanto al numero di ogni domanda dove lo
 *     studente scrive la lettera della risposta esatta (niente riga "Risposta"
 *     separata → risparmio di righe → una sola facciata).
 */
import { jsPDF } from "jspdf";

// ── Geometria A4 ────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;            // margine orizzontale (mm)
const CW = PAGE_W - 2 * M; // 178 mm (larghezze misurate con OpenDyslexic 14pt)
const M_TOP = 12;        // margine superiore visivo (mm)
const M_BOT = 12;        // margine inferiore (mm)
const MM_PER_PT = 0.352778;

// Fattori di interlinea candidati: parte da 1.5 (richiesto) e scende SOLO se un
// contenuto eccezionale non entra in una facciata (garanzia "una pagina sempre").
const FACTORS = [1.5, 1.45, 1.4, 1.35, 1.3, 1.25, 1.2, 1.15];

// ── Colori (palette app: carta/inchiostro/plum) ─────────────────────────────
const INK: [number, number, number] = [46, 33, 24];      // #2e2118
const PLUM: [number, number, number] = [168, 88, 56];    // #a85838
const GOLD: [number, number, number] = [190, 142, 79];   // #be8e4f
const GREEN: [number, number, number] = [30, 125, 50];   // risposta esatta (testo)
const GREEN_DARK: [number, number, number] = [14, 92, 36]; // spunta ✔ (più scura del verde risposta)
const RED: [number, number, number] = [190, 40, 40];     // ✘ errata
const GREY: [number, number, number] = [120, 110, 100];  // righe/separatori

// ── Simboli vettoriali ✔ / ✘ (OpenDyslexic NON ha i glifi U+2714/U+2718:
//    vengono DISEGNATI come grafica, subito a destra della lettera dell'opzione)
const SYMBOL_W = 4.8;            // larghezza occupata dal simbolo (mm)
const MARK_GAP_AFTER_LETTER = 1.7; // spazio tra "B)" e il simbolo ✔/✘
const MARK_GAP_BEFORE_TEXT = 1.7;  // spazio tra il simbolo e il testo (simmetrico)

// ── Font helpers (OpenDyslexic con fallback times) ──────────────────────────
interface FontState {
  name: string;
  fallback: boolean;
}
let fontState: FontState = { name: "OpenDyslexic", fallback: false };

// Cache base64 dei font (fetch una sola volta per sessione)
const fontCache: Record<string, string> = {};

function mmLineHeight(sizePt: number, factor: number): number {
  return sizePt * factor * MM_PER_PT;
}

async function fileToBase64(buf: ArrayBuffer): Promise<string> {
  // Node (test) o Browser
  if (typeof Buffer !== "undefined") return Buffer.from(buf).toString("base64");
  return new Promise<string>((resolve, reject) => {
    const blob = new Blob([buf]);
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function loadFontBase64(fileName: string, fontsBase: string): Promise<string> {
  if (fontCache[fileName]) return fontCache[fileName];
  const url = (fontsBase || "") + "/fonts/" + fileName;
  const res = await fetch(url);
  if (!res.ok) throw new Error("font " + fileName + " non disponibile");
  const ab = await res.arrayBuffer();
  fontCache[fileName] = await fileToBase64(ab);
  return fontCache[fileName];
}

/** Registra OpenDyslexic sul documento (VFS + addFont). Fallback: times. */
async function ensureFonts(doc: jsPDF, fontsBase: string): Promise<void> {
  if (fontState.fallback) return;
  try {
    const reg = await loadFontBase64("OpenDyslexic-Regular.ttf", fontsBase);
    const bold = await loadFontBase64("OpenDyslexic-Bold.ttf", fontsBase);
    doc.addFileToVFS("OpenDyslexic-Regular.ttf", reg);
    doc.addFileToVFS("OpenDyslexic-Bold.ttf", bold);
    doc.addFont("OpenDyslexic-Regular.ttf", "OpenDyslexic", "normal");
    doc.addFont("OpenDyslexic-Bold.ttf", "OpenDyslexic", "bold");
    doc.setFont("OpenDyslexic", "normal");
    fontState = { name: "OpenDyslexic", fallback: false };
  } catch (err) {
    // Font non caricabili (rete/offline): si usa times (sempre disponibile)
    fontState = { name: "times", fallback: true };
    doc.setFont("times", "normal");
  }
}

function setFontNormal(doc: jsPDF): void {
  doc.setFont(fontState.name, fontState.fallback ? "normal" : "normal");
}
function setFontBold(doc: jsPDF): void {
  doc.setFont(fontState.name, "bold");
}
function setFontItalic(doc: jsPDF): void {
  // times ha l'italico; OpenDyslexic non serve italico nei nuovi layout
  doc.setFont(fontState.name, fontState.fallback ? "italic" : "normal");
}

// ── Tipi (identici a prima) ─────────────────────────────────────────────────
interface Question {
  number: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface StudentAnswer {
  questionNumber: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

interface ReportStudent {
  name: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: number;
  answers: StudentAnswer[];
}

interface ReportData {
  className: string;
  schoolYear: string;
  classDate?: string;
  classCode: string;
  questions: Question[];
  students: ReportStudent[];
}

interface BlankQuestion {
  number: number;
  question: string;
  options: string[];
}

interface BlankQuestionsData {
  className: string;
  classDate?: string;
  questions: BlankQuestion[];
}

type RGB = [number, number, number];

interface SegPiece {
  kind: "text" | "symbol";
  text?: string;                 // se kind="text"
  symbol?: "check" | "cross";  // se kind="symbol"
  bold?: boolean;
  color?: RGB;
  gapAfter?: number;             // spazio extra dopo questo pezzo (mm)
}

interface Segment {
  text?: string;
  symbol?: "check" | "cross"; // simbolo vettoriale semplice (per legenda ecc.)
  parts?: SegPiece[];          // segmento composito: pezzi MAI spezzati a capo
  bold?: boolean;
  color?: RGB;
}

// ── Utility testo ───────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Conteggia le righe di un paragrafo semplice (usa il font corrente). */
function countLines(doc: jsPDF, text: string, maxW: number): number {
  return doc.splitTextToSize(text, maxW).length;
}

/**
 * Stima le righe di un flusso di segmenti (wrap tra un segmento e l'altro,
 * mai dentro un segmento). Deve usare gli stessi font/colori del draw.
 */
function countInlineLines(
  doc: jsPDF,
  segs: Segment[],
  maxW: number,
  gap: number
): number {
  let x = 0;
  let lines = 1;
  for (let i = 0; i < segs.length; i++) {
    const w = segmentWidth(doc, segs[i]);
    if (x > 0 && x + w > maxW) {
      x = 0;
      lines++;
    }
    x += w;
    if (i < segs.length - 1) x += gap;
  }
  setFontNormal(doc);
  return lines;
}

/** Larghezza di un singolo pezzo (testo o simbolo). */
function pieceWidth(doc: jsPDF, p: SegPiece): number {
  if (p.kind === "symbol") return SYMBOL_W;
  if (p.bold) setFontBold(doc);
  else setFontNormal(doc);
  return doc.getTextWidth(p.text ?? "");
}

/** Larghezza complessiva di un segmento (semplice o composito con ✔/✘). */
function segmentWidth(doc: jsPDF, s: Segment): number {
  if (s.parts) {
    let w = 0;
    for (let i = 0; i < s.parts.length; i++) {
      const p = s.parts[i];
      w += pieceWidth(doc, p);
      if (p.gapAfter) w += p.gapAfter;
    }
    return w;
  }
  if (s.symbol) return SYMBOL_W;
  if (s.bold) setFontBold(doc);
  else setFontNormal(doc);
  return doc.getTextWidth(s.text ?? "");
}

/** Disegna il simbolo vettoriale ✔ (spunta) o ✘ (croce) sopra la baseline. */
function drawSymbol(
  doc: jsPDF,
  kind: "check" | "cross",
  color: [number, number, number],
  x: number,
  y: number
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(1.0);
  try {
    // Spunta: vertice aguzzo (miter), estremità arrotondate (round cap)
    if (kind === "check") doc.setLineJoin("miter");
    else doc.setLineJoin("round");
    doc.setLineCap("round");
  } catch {
    /* API non disponibile: ignora */
  }
  if (kind === "check") {
    // ✔: spunta tipografica compatta, CENTRATA nel box SYMBOL_W:
    // dal cap-height reale del font (misurato ~3.6 mm sopra la baseline a
    // 14 pt) al vertice che tocca quasi la baseline. Larghezza tracciata ~4.1 mm.
    doc.lines(
      [
        [1.0, 3.3],
        [2.7, -2.9],
      ],
      x + 0.35,
      y - 3.85,
      [1, 1],
      "S",
      false
    );
  } else {
    // ✘: due diagonali incrociate, centrate nel box
    doc.line(x + 0.55, y - 0.7, x + 4.15, y - 3.7);
    doc.line(x + 0.55, y - 3.7, x + 4.15, y - 0.7);
  }
  try {
    doc.setLineCap("butt");
    doc.setLineJoin("miter");
  } catch {
    /* ignora */
  }
}

/** Disegna un segmento composito (lettera + ✔/✘ + testo) senza mai spezzarlo. */
function drawParts(
  doc: jsPDF,
  parts: SegPiece[],
  xStart: number,
  y: number
): number {
  let x = xStart;
  for (const p of parts) {
    if (p.kind === "symbol") {
      drawSymbol(doc, p.symbol!, p.color ?? GREEN_DARK, x, y);
      x += SYMBOL_W;
    } else {
      if (p.bold) setFontBold(doc);
      else setFontNormal(doc);
      if (p.color) doc.setTextColor(p.color[0], p.color[1], p.color[2]);
      else doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(p.text ?? "", x, y);
      x += doc.getTextWidth(p.text ?? "");
    }
    if (p.gapAfter) x += p.gapAfter;
  }
  return x;
}

/** Disegna un flusso di segmenti con wrap tra segmenti; ritorna la baseline y successiva. */
function drawInline(
  doc: jsPDF,
  segs: Segment[],
  xStart: number,
  y: number,
  maxW: number,
  gap: number,
  lineH: number
): number {
  let x = xStart;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const w = segmentWidth(doc, s);
    if (x > xStart && x + w > xStart + maxW) {
      x = xStart;
      y += lineH;
    }
    if (s.parts) {
      x = drawParts(doc, s.parts, x, y);
    } else if (s.symbol) {
      drawSymbol(doc, s.symbol, s.color ?? GREEN_DARK, x, y);
      x += SYMBOL_W;
    } else {
      if (s.bold) setFontBold(doc);
      else setFontNormal(doc);
      if (s.color) doc.setTextColor(s.color[0], s.color[1], s.color[2]);
      else doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(s.text ?? "", x, y);
      x += doc.getTextWidth(s.text ?? "");
    }
    if (i < segs.length - 1) x += gap;
  }
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  // Ritorna la baseline della riga SUCCESSIVA (come drawWrapped): se il flusso
  // è stato disegnato su 1..k righe, il chiamante deve ripartire una riga più
  // giù, non dalla baseline dell'ultima riga (altrimenti le righe si accavallano).
  return y + lineH;
}

/** Disegna un paragrafo semplice (già spezzato in righe) e ritorna la y finale. */
function drawWrapped(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  lineH: number
): number {
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y);
    y += lineH;
  }
  return y;
}

// =============================================================================
// REPORT PDF — una facciata A4 per studente (domande con ✔/✘ dopo la lettera)
// =============================================================================

/** Crea i segmenti delle opzioni marcate. Il simbolo ✔/✘ è un pezzo composito
 *  subito DOPO la lettera (es. "B) ✔ testo"), mai spezzato a capo dalla lettera.
 *  Colori: ✔ verde scuro (più scuro del verde della risposta esatta), ✘ rossa;
 *  l'opzione esatta non scelta resta in verde senza simbolo. */
function buildOptionSegments(q: Question, selected: string | null): Segment[] {
  const correctIdx = q.options.indexOf(q.correctAnswer);
  const chosenIdx = selected ? q.options.indexOf(selected) : -1;
  const segs: Segment[] = [];
  q.options.forEach((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    const isChosen = i === chosenIdx;
    const isCorrectOpt = i === correctIdx;
    const isRight = isChosen && isCorrectOpt;
    let color: RGB | undefined;
    let bold = false;
    if (isChosen) {
      color = isRight ? GREEN : RED;
      bold = true;
    } else if (isCorrectOpt) {
      color = GREEN; // opzione esatta sempre in verde
      bold = true;
    }
    if (isChosen) {
      // Composito indivisibile: lettera + simbolo + testo (con spazio iniziale)
      segs.push({
        parts: [
          { kind: "text", text: `${letter})`, bold, color, gapAfter: MARK_GAP_AFTER_LETTER },
          {
            kind: "symbol",
            symbol: isRight ? "check" : "cross",
            color: isRight ? GREEN_DARK : RED,
            gapAfter: MARK_GAP_BEFORE_TEXT,
          },
          { kind: "text", text: opt, bold, color },
        ],
      });
    } else {
      segs.push({ text: `${letter}) ${opt}`, bold, color });
    }
  });
  return segs;
}

function measureQuestionReport(
  doc: jsPDF,
  q: Question,
  selected: string | null
): { lines: number; inlineLines: number } {
  doc.setFontSize(14);
  setFontBold(doc);
  const lines = countLines(doc, `${q.number}. ${q.question}`, CW - 4);
  doc.setFontSize(14);
  const segs = buildOptionSegments(q, selected);
  const inlineLines = countInlineLines(doc, segs, CW, 3);
  setFontNormal(doc);
  return { lines, inlineLines };
}

/** Altezza totale necessaria (mm) per il report di uno studente, a un dato fattore. */
function estimateReportPage(
  doc: jsPDF,
  data: ReportData,
  student: ReportStudent,
  factor: number
): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let h = 0;
  // titolo
  doc.setFontSize(15);
  setFontBold(doc);
  h += countLines(doc, "QUESTIONARIO SU WILLIAM SHAKESPEARE", CW) * lh15 + 2.2;
  // studente
  h += countLines(doc, `Studente: ${student.name}`, CW) * lh15 + 1.6;
  // classe · data · voto
  doc.setFontSize(14);
  setFontNormal(doc);
  const info = `Classe: ${data.className}   ·   Data: ${fmtDate(data.classDate)}   ·   Voto: ${Math.round(student.grade)}/${data.questions.length}`;
  h += countLines(doc, info, CW) * lh14 + 2.4; // regolo sotto l'header
  // domande
  for (const q of data.questions) {
    const ans = student.answers.find((a) => a.questionNumber === q.number);
    const sel = ans?.selectedAnswer ?? null;
    const m = measureQuestionReport(doc, q, sel);
    h += m.lines * lh14 + m.inlineLines * lh14;
    h += 1.6; // respiro tra una domanda e l'altra
  }
  h += 2.4; // prima della legenda
  // legenda con simboli vettoriali ✔/✘
  setFontNormal(doc);
  h += countInlineLines(doc, buildLegendSegments(), CW, 3) * lh14 + 2.2;
  // box PUNTEGGIO: 2 righe + padding
  h += lh15 + lh14 + 7;
  return h;
}

/** Legenda con i simboli vettoriali (OpenDyslexic non ha i glifi ✔/✘). */
function buildLegendSegments(): Segment[] {
  return [
    {
      parts: [
        { kind: "symbol", symbol: "check", color: GREEN_DARK, gapAfter: 1.4 },
        { kind: "text", text: "risposta corretta   ·   ", color: INK },
        { kind: "symbol", symbol: "cross", color: RED, gapAfter: 1.4 },
        { kind: "text", text: "risposta errata   ·   verde = risposta esatta", color: INK },
      ],
    },
  ];
}

function drawReportPage(
  doc: jsPDF,
  data: ReportData,
  student: ReportStudent,
  factor: number
): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh14 * 0.72; // prima baseline (ascesa del carattere sotto il margine)

  // ── Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
  const titleLines = doc.splitTextToSize("QUESTIONARIO SU WILLIAM SHAKESPEARE", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 2.4;

  // ── Studente (centrato)
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const nameLines = doc.splitTextToSize(`Studente: ${student.name}`, CW);
  doc.text(nameLines, PAGE_W / 2, y, { align: "center" });
  y += nameLines.length * lh15 + 1.8;

  // ── Classe · Data · Voto (centrato)
  doc.setFontSize(14);
  setFontNormal(doc);
  const info = `Classe: ${data.className}   ·   Data: ${fmtDate(data.classDate)}   ·   Voto: ${Math.round(student.grade)}/${data.questions.length}`;
  const infoLines = doc.splitTextToSize(info, CW);
  doc.text(infoLines, PAGE_W / 2, y, { align: "center" });
  y += infoLines.length * lh14 + 2.6;

  // ── Filetto sottile plum
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.35);
  doc.line(M, y - 1.4, PAGE_W - M, y - 1.4);
  // Spazio reale sotto il filetto: l'ascesa dei glifi OpenDyslexic a 14pt è
  // ~3.8 mm, quindi la baseline della prima domanda deve stare ad almeno
  // ~5 mm dal filetto (mai 1.2 mm: la cima delle lettere taglia la linea).
  y += 4.3;

  // ── Domande (con ✔/✘ subito dopo la lettera dell'opzione scelta)
  for (const q of data.questions) {
    const ans = student.answers.find((a) => a.questionNumber === q.number);
    const sel = ans?.selectedAnswer ?? null;

    doc.setFontSize(14);
    setFontBold(doc);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const qLines = doc.splitTextToSize(`${q.number}. ${q.question}`, CW - 4);
    y = drawWrapped(doc, qLines, M, y, lh14) + 0.4;

    doc.setFontSize(14);
    const segs = buildOptionSegments(q, sel);
    y = drawInline(doc, segs, M, y, CW, 3, lh14) + 1.6;
  }

  // ── Legenda con simboli vettoriali ✔/✘
  y += 1;
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  y = drawInline(doc, buildLegendSegments(), M, y, CW, 3, lh14) + 2.2;

  // ── Box PUNTEGGIO (sempre insieme, mai spezzato)
  const lineBig = `PUNTEGGIO: ${Math.round(student.grade)}/${data.questions.length}`;
  const lineSmall = `Ogni risposta corretta vale 1 punto · Massimo ${data.questions.length}/${data.questions.length}`;
  doc.setFontSize(15);
  setFontBold(doc);
  const wBig = doc.getTextWidth(lineBig);
  doc.setFontSize(14);
  setFontNormal(doc);
  const wSmall = doc.getTextWidth(lineSmall);
  const boxW = Math.min(CW, Math.max(wBig, wSmall) + 10);
  const boxX = (PAGE_W - boxW) / 2;
  const innerLineH = lh15 + lh14 + 6.5;
  const boxH = innerLineH;
  const boxY = y;

  // bordo plum
  doc.setDrawColor(PLUM[0], PLUM[1], PLUM[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2);
  // riga grande
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
  doc.text(lineBig, PAGE_W / 2, boxY + lh15 * 0.9, { align: "center" });
  // riga piccola
  doc.setFontSize(14);
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(lineSmall, PAGE_W / 2, boxY + lh15 * 1.35 + lh14 * 0.75, { align: "center" });
  setFontNormal(doc);
  return boxY + boxH;
}

export async function buildReportPdfDoc(data: ReportData, fontsBase = ""): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;

  // Sceglie il fattore di interlinea (max 1.5): preflight REALE — disegna la
  // pagina su un documento di prova e tiene il fattore solo se l'ultima riga
  // (box PUNTEGGIO compreso) resta dentro il margine inferiore. Garanzia:
  // ogni studente sta SEMPRE su una sola facciata.
  async function pickFactor(data: ReportData, student: ReportStudent): Promise<number> {
    for (const f of FACTORS) {
      const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await ensureFonts(probe, fontsBase);
      probe.setLineHeightFactor(f);
      const endY = drawReportPage(probe, data, student, f);
      if (endY <= bottomLimit) return f;
    }
    return FACTORS[FACTORS.length - 1];
  }

  // Usa un fattore unico per tutte le pagine (coerenza grafica) = il minimo
  // tra i fattori richiesti dai singoli studenti.
  let factor = FACTORS[0];
  for (const student of data.students) {
    const needed = await pickFactor(data, student);
    if (needed < factor) factor = needed;
  }
  doc.setLineHeightFactor(factor);

  data.students.forEach((student, si) => {
    if (si > 0) doc.addPage();
    drawReportPage(doc, data, student, factor);
  });

  return doc;
}

export async function generateReportPdf(data: ReportData): Promise<void> {
  const doc = await buildReportPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Report_Quiz_${safeName}_${data.classCode}.pdf`);
}

// =============================================================================
// BLANK QUESTIONNAIRE PDF — una facciata A4, casella-risposta accanto al numero
// =============================================================================

function measureBlankQuestion(
  doc: jsPDF,
  q: BlankQuestion
): { lines: number; inlineLines: number } {
  doc.setFontSize(14);
  setFontBold(doc);
  // testo domanda indentato (dopo la casella 10 mm)
  const lines = countLines(doc, `${q.number}. ${q.question}`, CW - 4 - 12);
  doc.setFontSize(14);
  const segs = q.options.map((opt, i) => ({
    text: `${String.fromCharCode(65 + i)}) ${opt}`,
  }));
  const inlineLines = countInlineLines(doc, segs, CW, 3);
  setFontNormal(doc);
  return { lines, inlineLines };
}

function estimateBlankPage(
  doc: jsPDF,
  data: BlankQuestionsData,
  factor: number
): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let h = 0;
  // titolo
  doc.setFontSize(15);
  setFontBold(doc);
  h += countLines(doc, "QUESTIONARIO SU WILLIAM SHAKESPEARE", CW) * lh15 + 2.4;
  // riga campi (COGNOME/NOME/CLASSE/DATA)
  doc.setFontSize(14);
  setFontBold(doc);
  h += lh14 + 3.2;
  // domande
  for (const q of data.questions) {
    const m = measureBlankQuestion(doc, q);
    h += m.lines * lh14 + m.inlineLines * lh14;
    h += 1.6;
  }
  h += 2.4;
  // box PUNTEGGIO: 2 righe + padding
  h += lh15 + lh14 + 7;
  return h;
}

function drawBlankPage(doc: jsPDF, data: BlankQuestionsData, factor: number): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh14 * 0.72;

  // ── Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
  const titleLines = doc.splitTextToSize("QUESTIONARIO SU WILLIAM SHAKESPEARE", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 2.6;

  // ── Campi: COGNOME / NOME / CLASSE / DATA (su una sola riga)
  doc.setFontSize(14);
  setFontBold(doc);
  doc.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
  const fields = ["COGNOME", "NOME", "CLASSE", "DATA"];
  const colW = CW / 4;
  fields.forEach((label, i) => {
    const x = M + i * colW;
    doc.text(label + ":", x, y);
    const lw = doc.getTextWidth(label + ":");
    const lineX = x + lw + 2;
    const lineEnd = x + colW - 2;
    doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
    doc.setLineWidth(0.3);
    doc.line(lineX, y + 1.3, lineEnd, y + 1.3);
  });
  y += lh14 + 2.6;

  // ── Filetto
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.35);
  doc.line(M, y - 1.4, PAGE_W - M, y - 1.4);
  // ⚠️ QUIZ: serve PIÙ spazio che nel report perché la casella quadrata della
  // domanda 1 sale di lh14*0.78 ≈ 5.78 mm sopra la baseline (a 14 pt × 1.5).
  // Con 4.3 mm la casella (top = y-5.78) finiva a ~0.1 mm SOPRA il filetto
  // (linea a y-5.7). Con 7.6 mm la casella resta ~3 mm sotto la linea. (fix 2026-09-04)
  y += 7.6;

  // ── Domande (casella quadrata per la lettera-risposta accanto al numero)
  for (const q of data.questions) {
    doc.setFontSize(14);
    setFontBold(doc);
    doc.setTextColor(INK[0], INK[1], INK[2]);

    // casella risposta
    const boxSide = 7;
    const boxX = M;
    const boxY = y - lh14 * 0.78;
    doc.setDrawColor(PLUM[0], PLUM[1], PLUM[2]);
    doc.setLineWidth(0.35);
    doc.rect(boxX, boxY, boxSide, boxSide);

    const qLines = doc.splitTextToSize(`${q.number}. ${q.question}`, CW - 4 - 12);
    y = drawWrapped(doc, qLines, M + boxSide + 3, y, lh14) + 0.4;

    doc.setFontSize(14);
    const segs = q.options.map((opt, i) => ({
      text: `${String.fromCharCode(65 + i)}) ${opt}`,
    }));
    y = drawInline(doc, segs, M, y, CW, 3, lh14) + 1.6;
  }

  // ── Box PUNTEGGIO
  y += 1;
  const lineBig = "PUNTEGGIO";
  const lineSmall = `Ogni risposta corretta vale 1 punto · Massimo ${data.questions.length}/${data.questions.length}`;
  doc.setFontSize(15);
  setFontBold(doc);
  const wBig = doc.getTextWidth(lineBig);
  doc.setFontSize(14);
  setFontNormal(doc);
  const wSmall = doc.getTextWidth(lineSmall);
  const boxW = Math.min(CW, Math.max(wBig, wSmall) + 10);
  const boxX = (PAGE_W - boxW) / 2;
  const boxY = y;
  const boxH = lh15 + lh14 + 6.5;

  doc.setDrawColor(PLUM[0], PLUM[1], PLUM[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2);
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(PLUM[0], PLUM[1], PLUM[2]);
  doc.text(lineBig, PAGE_W / 2, boxY + lh15 * 0.9, { align: "center" });
  doc.setFontSize(14);
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(lineSmall, PAGE_W / 2, boxY + lh15 * 1.35 + lh14 * 0.75, { align: "center" });
  setFontNormal(doc);
  return boxY + boxH;
}

export async function buildBlankQuestionsPdfDoc(
  data: BlankQuestionsData,
  fontsBase = ""
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;
  // Preflight reale: sceglie il fattore (max 1.5) che tiene TUTTO su una facciata
  let factor = FACTORS[0];
  for (const f of FACTORS) {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await ensureFonts(probe, fontsBase);
    probe.setLineHeightFactor(f);
    const endY = drawBlankPage(probe, data, f);
    if (endY <= bottomLimit) {
      factor = f;
      break;
    }
  }
  doc.setLineHeightFactor(factor);
  drawBlankPage(doc, data, factor);
  return doc;
}

export async function generateBlankQuestionsPdf(
  data: BlankQuestionsData
): Promise<void> {
  const doc = await buildBlankQuestionsPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Questionario_Shakespeare_${safeName}.pdf`);
}
