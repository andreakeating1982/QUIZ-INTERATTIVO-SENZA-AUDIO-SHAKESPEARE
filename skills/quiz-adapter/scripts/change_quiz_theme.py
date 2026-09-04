#!/usr/bin/env python3
"""
change_quiz_theme.py — Sostituisce il set di domande (e i riferimenti al numero
di domande) in un'app clonata del tipo QUIZ INTERATTIVO SORGENTE.

Usage:
    python change_quiz_theme.py questions.json [--project /percorso/progetto]

- `--project` di default è `/home/user/shakespeare-quiz` (il SORGENTE).
- Lo script aggiorna SEMPRE ENTRAMBE le copie dei file mirror (radice + client).
- Il voto finale = numero di risposte corrette (1 pt ciascuna); il massimo è N/N dove N = numero domande.

Input JSON format (questions.json):
{
  "title": "QUESTIONARIO SULL'ANTICA ROMA",
  "report_pdf_filename": "Report_Quiz",      // opzionale
  "blank_pdf_filename": "Questionario",       // opzionale
  "questions": [
    {
      "number": 1,
      "question": "In che anno è stata fondata Roma?",
      "options": ["753 a.C.", "476 a.C.", "27 a.C.", "313 d.C."],
      "correctAnswer": "753 a.C."
    }
  ]
}

Note: le domande possono essere in qualsiasi numero (anche > 10) e le opzioni in
qualsiasi quantità (>= 2). Il voto finale dello studente = risposte corrette
(1 pt ciascuna), massimo N/N.
"""

import json
import sys
import os
import shutil
import re
from pathlib import Path

DEFAULT_PROJECT = Path("/home/user/shakespeare-quiz")


def parse_args(argv):
    """Parses arguments: questions.json [--project path]."""
    project = DEFAULT_PROJECT
    positional = []
    i = 0
    while i < len(argv):
        if argv[i] == "--project":
            i += 1
            if i >= len(argv):
                bail("--project richiede un percorso")
            project = Path(argv[i])
        else:
            positional.append(argv[i])
        i += 1
    if len(positional) < 1:
        bail("Usage: python change_quiz_theme.py <questions.json> [--project /path]")
    return Path(positional[0]), project


# ── Helpers ────────────────────────────────────────────────────────────────

def bail(msg: str) -> None:
    print(f"❌ ERROR: {msg}")
    sys.exit(1)


def backup(file: Path, backup_dir: Path) -> None:
    """Create a timestamped backup of *file* inside backup_dir."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    ts = os.path.getmtime(file) if file.exists() else "0"
    dest = backup_dir / f"{file.name}.bak.{int(ts)}"
    shutil.copy2(file, dest)
    print(f"  ✔ Backup: {dest.name}")


def read_or_bail(path: Path) -> str:
    if not path.exists():
        bail(f"File non trovato: {path}")
    return path.read_text(encoding="utf-8")


# ── File-modification functions ────────────────────────────────────────────
# Ogni funzione riceve la lista dei percorsi (tutte le copie mirror).

def replace_questions_ts(paths: list[Path], data: list[dict], backup_dir: Path) -> None:
    """Replace the entire questions array (export const <NAME>_QUESTIONS = [...])."""
    for path in paths:
        backup(path, backup_dir)
        lines = []
        for q in data:
            opts = json.dumps(q["options"])
            answer = json.dumps(q["correctAnswer"])
            lines.append("  {")
            lines.append(f'    number: {q["number"]},')
            lines.append(f'    question: {json.dumps(q["question"])},')
            lines.append(f"    options: {opts},")
            lines.append(f"    correctAnswer: {answer},")
            lines.append("  },")

        content = read_or_bail(path)

        # Trova l'array delle domande: "export const X_QUESTIONS = [" ... "];"
        m = re.search(r"export const \w+_QUESTIONS = \[", content)
        if not m:
            bail(f"Array domande non trovato in {path}")
        start = m.start()
        bracket = m.end()
        end_bracket = content.rindex("];") + 2

        new = (
            content[:bracket]
            + "\n"
            + "\n".join(lines)
            + "\n"
            + "];"
            + content[end_bracket:]
        )
        path.write_text(new, encoding="utf-8")
        print(f"  ✔ {path.name} — {len(data)} domande scritte")


def replace_max_in_routers(paths: list[Path], count: int, backup_dir: Path) -> None:
    """Update all `.min(1).max(10)` and `.min(0).max(10)` to `.max(count)` in routers."""
    for path in paths:
        backup(path, backup_dir)
        content = read_or_bail(path)
        # Se il sorgente ha già N (es. clone con 10 domande come il sorgente),
        # le regex non cambiano nulla: va bene, non è un errore.
        has_max10 = ".max(10)" in content
        # questionNumber validators: .min(1).max(10) → .min(1).max(count)
        new = re.sub(r"\.min\(1\)\.max\(10\)", f".min(1).max({count})", content)
        # score validator: .min(0).max(10) → .min(0).max(count)  (il voto = risposte corrette)
        new = re.sub(r"\.min\(0\)\.max\(10\)", f".min(0).max({count})", new)
        if not has_max10:
            bail(f"Nessun '.max(10)' trovato in {path} — validatori non aggiornati")
        if new != content:
            path.write_text(new, encoding="utf-8")
            print(f"  ✔ {path.name} — .max({count}) applicato (questionNumber + score)")
        else:
            print(f"  ✔ {path.name} — già .max({count}) (nessuna modifica necessaria)")


def replace_in_teacher_page(paths: list[Path], count: int, backup_dir: Path) -> None:
    """Update hardcoded /10 and >=10 in TeacherPage (entrambe le copie mirror)."""
    for path in paths:
        backup(path, backup_dir)
        content = read_or_bail(path)
        original = content

        content = content.replace("Domanda {classDetail.currentQuestion}/10",
                                  f"Domanda {{classDetail.currentQuestion}}/{count}")
        content = content.replace("Domanda {classDetail?.currentQuestion || 1}/10",
                                  f"Domanda {{classDetail?.currentQuestion || 1}}/{count}")
        content = content.replace(
            "(classDetail?.currentQuestion || 0) >= 10",
            f"(classDetail?.currentQuestion || 0) >= {count}",
        )
        content = content.replace(
            "correctAnswers + '/10'",
            f"correctAnswers + '/{count}'",
        )
        content = content.replace(
            "studentAnswers.length + '/10 risposte'",
            f"studentAnswers.length + '/{count} risposte'",
        )

        if content == original:
            print(f"  ⚠️  {path.name} — nessuna sostituzione trovata (stringhe già aggiornate?)")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  ✔ {path.name} — /{count} e >={count} applicati")


def replace_in_student_page(paths: list[Path], count: int, backup_dir: Path) -> None:
    """Update hardcoded /10 in StudentQuiz (entrambe le copie mirror)."""
    for path in paths:
        backup(path, backup_dir)
        content = read_or_bail(path)
        original = content

        content = content.replace("DOMANDA {currentQNum}/10",
                                  f"DOMANDA {{currentQNum}}/{count}")
        content = content.replace("(currentQNum / 10) * 100",
                                  f"(currentQNum / {count}) * 100")

        if content == original:
            print(f"  ⚠️  {path.name} — nessuna sostituzione trovata (stringhe già aggiornate?)")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  ✔ {path.name} — /{count} applicato")


def replace_in_db(paths: list[Path], count: int, backup_dir: Path) -> None:
    """Update db.ts: question limit (Math.min(..., 10)) and grade (= correctCount)."""
    for path in paths:
        backup(path, backup_dir)
        content = read_or_bail(path)
        original = content

        # nextQuestion: limita la domanda corrente al numero reale di domande
        content = content.replace(
            "Math.min((cls.currentQuestion || 0) + 1, 10)",
            f"Math.min((cls.currentQuestion || 0) + 1, {count})",
        )
        # grade: il voto = numero di risposte corrette (1 pt ciascuna, massimo N/N)
        content = content.replace(
            "const grade = Math.round((correctCount / totalQuestions) * 10 * 10) / 10;",
            "const grade = correctCount;",
        )

        if content == original:
            print(f"  ⚠️  {path.name} — nessuna sostituzione trovata (già adattato?)")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  ✔ {path.name} — limite {count} domande e voto = risposte corrette")


def replace_in_report_pdf(paths: list[Path], new_title: str, report_filename: str,
                          blank_filename: str, backup_dir: Path) -> None:
    """Replace PDF titles, filenames, and the 2×2 option grid (entrambi i mirror)."""
    for path in paths:
        backup(path, backup_dir)
        content = read_or_bail(path)
        original = content

        # ── Titolo (report usa TOP + 1, questionario bianco usa y) ──
        content = content.replace(
            'doc.text("QUESTIONARIO SU WILLIAM SHAKESPEARE", PAGE_W / 2, TOP + 1, { align: "center" });',
            f'doc.text("{new_title}", PAGE_W / 2, TOP + 1, {{ align: "center" }});',
        )
        content = content.replace(
            'doc.text("QUESTIONARIO SU WILLIAM SHAKESPEARE", PAGE_W / 2, y, { align: "center" });',
            f'doc.text("{new_title}", PAGE_W / 2, y, {{ align: "center" }});',
        )

        # ── Nomi file PDF ──
        content = content.replace("doc.save(`Report_Quiz_",
                                  f"doc.save(`{report_filename}_")
        content = content.replace("doc.save(`Questionario_Shakespeare_",
                                  f"doc.save(`{blank_filename}_")

        # ── Griglia opzioni — REPORT (usa M + 2, spaziatura 2.8/3.2) ──
        old_grid_report = """    const halfW = CW / 2 - 2;
    const optLabels = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`);

    // Row 1 (options 0-1)
    doc.text(optLabels[0], M + 2, y);
    doc.text(optLabels[1], M + 2 + halfW, y);
    y += 2.8;

    // Row 2 (options 2-3)
    doc.text(optLabels[2], M + 2, y);
    doc.text(optLabels[3], M + 2 + halfW, y);
    y += 3.2;"""

        new_grid_report = """    const halfW = CW / 2 - 2;
    const optLabels = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`);

    // Dynamic grid (any number of options)
    q.options.forEach((_, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      doc.text(optLabels[idx], M + 2 + col * halfW, y + row * 2.8);
    });
    y += Math.ceil(q.options.length / 2) * 2.8 + 0.4;"""

        content = content.replace(old_grid_report, new_grid_report)

        # ── Griglia opzioni — QUESTIONARIO BIANCO (usa M + 2) ──
        old_grid_blank = """    const halfW = CW / 2 - 4;
    const optLabels = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`);

    doc.text(optLabels[0], M + 2, y);
    doc.text(optLabels[1], M + 2 + halfW, y);
    y += 3.8;

    doc.text(optLabels[2], M + 2, y);
    doc.text(optLabels[3], M + 2 + halfW, y);
    y += 4.5;"""

        new_grid_blank = """    const halfW = CW / 2 - 4;
    const optLabels = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`);

    // Dynamic grid (any number of options)
    q.options.forEach((_, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      doc.text(optLabels[idx], M + 2 + col * halfW, y + row * 3.8);
    });
    y += Math.ceil(q.options.length / 2) * 3.8 + 0.7;"""

        content = content.replace(old_grid_blank, new_grid_blank)

        if content == original:
            print(f"  ⚠️  {path.name} — nessuna sostituzione trovata (già adattato?)")
        else:
            path.write_text(content, encoding="utf-8")
            print(f"  ✔ {path.name} — titoli, nomi file, griglia dinamica applicati")


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    json_path, project = parse_args(sys.argv[1:])
    if not json_path.exists():
        bail(f"File non trovato: {json_path}")

    payload = json.loads(json_path.read_text(encoding="utf-8"))

    # Validazione
    if "questions" not in payload or not isinstance(payload["questions"], list):
        bail("Il JSON deve contenere un array 'questions'")
    if not payload["questions"]:
        bail("L'array questions è vuoto")
    if "title" not in payload:
        bail("Il JSON deve contenere una stringa 'title'")

    title = payload["title"]
    questions = payload["questions"]
    count = len(questions)

    for q in questions:
        if not all(k in q for k in ("number", "question", "options", "correctAnswer")):
            bail(f"Domanda #{q.get('number', '?')} manca di uno di: number, question, options, correctAnswer")
        if not isinstance(q["options"], list) or len(q["options"]) < 2:
            bail(f"Domanda #{q['number']} deve avere almeno 2 opzioni")

    report_fn = payload.get("report_pdf_filename", "Report_Quiz")
    blank_fn = payload.get("blank_pdf_filename", "Questionario")

    # ── Percorsi (entrambe le copie mirror per ogni ruolo) ──
    P = project
    FILES = {
        "questions":    [P / "server" / "questions.ts", P / "questions.ts"],
        "routers":      [P / "server" / "routers.ts"],
        "db":           [P / "server" / "db.ts"],
        "teacher_page": [P / "client" / "src" / "pages" / "TeacherPage.tsx", P / "TeacherPage.tsx"],
        "student_page": [P / "client" / "src" / "pages" / "StudentQuiz.tsx", P / "StudentQuiz.tsx"],
        "report_pdf":   [P / "client" / "src" / "lib" / "reportPdf.ts", P / "reportPdf.ts"],
    }
    BACKUP_DIR = P / ".quiz-backups"

    print(f"\n🚀 Cambio set domande in: {project}")
    print(f"   Titolo: {title} — Domande: {count}\n")

    print("[1/5] Sostituzione array domande …")
    replace_questions_ts(FILES["questions"], questions, BACKUP_DIR)

    print("[2/5] Aggiornamento validatori numero domande …")
    replace_max_in_routers(FILES["routers"], count, BACKUP_DIR)

    print("[3/5] Aggiornamento TeacherPage.tsx (mirror) …")
    replace_in_teacher_page(FILES["teacher_page"], count, BACKUP_DIR)

    print("[4/6] Aggiornamento StudentQuiz.tsx (mirror) …")
    replace_in_student_page(FILES["student_page"], count, BACKUP_DIR)

    print("[5/6] Aggiornamento db.ts (limite domande + voto) …")
    replace_in_db(FILES["db"], count, BACKUP_DIR)

    print("[6/6] Aggiornamento reportPdf.ts (mirror) …")
    replace_in_report_pdf(FILES["report_pdf"], title, report_fn, blank_fn, BACKUP_DIR)

    print(f"\n✅ Fatto! {count} domande scritte in {project}\n")
    print("Prossimi passi:")
    print(f"  1. cd {project}")
    print("  2. pnpm check         (verifica errori TypeScript)")
    print("  3. pnpm build         (compila per la produzione)")
    print("  4. Deploy preview → conferma utente → deploy produzione")
    print(f"\n📁 Backup salvati in: {BACKUP_DIR}\n")


if __name__ == "__main__":
    main()
