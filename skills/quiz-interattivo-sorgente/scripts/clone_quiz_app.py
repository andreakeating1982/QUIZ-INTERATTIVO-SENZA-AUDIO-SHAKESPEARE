#!/usr/bin/env python3
"""
clone_quiz_app.py — Clona l'app QUIZ INTERATTIVO SORGENTE in una nuova app
identica, con un set di domande diverso.

Usage:
    python clone_quiz_app.py --name <nome-progetto> --questions <domande.json> [opzioni]

Opzioni:
    --name <nome>        Nome della nuova app (solo minuscole, numeri, trattini).
                         Es. "quiz-roma-antica"  →  /home/user/quiz-roma-antica
    --questions <path>   File JSON con il nuovo set di domande (vedi template).
    --title <titolo>     Titolo mostrato nella scheda del browser
                         (es. "Quiz Antica Roma"). Opzionale: se omesso mantiene
                         "Shakespeare Quiz Interattivo".
    --source <path|url>  Progetto sorgente da clonare (default:
                         /home/user/shakespeare-quiz). Può essere un percorso
                         locale OPPURE un URL di repository GitHub (es.
                         https://github.com/andreakeating1982/shakespeare-quiz):
                         in tal caso la repository viene clonata in
                         /home/user/_repo_<nome> e usata come sorgente.
    --adapter <path>     Percorso di change_quiz_theme.py (default: auto-rileva
                         prima nella skill quiz-interattivo-sorgente, poi in
                         quiz-adapter).
    --force              Sovrascrive la cartella di destinazione se esiste.
    --no-install         Salta pnpm install e pnpm check (per test rapidi).

Cosa fa:
    1. Copia l'intero progetto sorgente (esclusi node_modules, .git, dist,
       .quiz-backups, ZIP, guide HTML di branding).
    2. Rinomina package.json (name) e il <title> di client/index.html.
    3. Inizializza git nella copia (per i checkpoint webdev).
    4. Lancia change_quiz_theme.py sulla copia con il JSON delle domande:
       aggiorna domande, validatori, riferimenti /N e PDF — in TUTTE le copie
       mirror (radice + client).
    5. Esegue pnpm install e pnpm check (salvo --no-install).

Output atteso: una nuova app pronta per il deploy preview.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT_SOURCE = Path("/home/user/shakespeare-quiz")
SKILL_DIR = Path(__file__).resolve().parent
ADAPTER_CANDIDATES = [
    SKILL_DIR / "change_quiz_theme.py",
    Path("/home/user/skills/quiz-adapter/scripts/change_quiz_theme.py"),
]

# Cartelle/file esclusi dalla copia
IGNORED = shutil.ignore_patterns(
    "node_modules", ".git", "dist", ".quiz-backups",
    "*.zip", "*.bak.*", ".DS_Store", "GUIDA-*.html", "GUIDA-*.md",
)


def bail(msg: str) -> None:
    print(f"❌ ERROR: {msg}")
    sys.exit(1)


def find_adapter(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit)
        if not p.exists():
            bail(f"Adapter non trovato: {p}")
        return p
    for cand in ADAPTER_CANDIDATES:
        if cand.exists():
            return cand
    bail("change_quiz_theme.py non trovato né nella skill quiz-interattivo-sorgente né in quiz-adapter")


def rename_project(dest: Path, name: str, title: str | None) -> None:
    """Aggiorna package.json (name) e client/index.html (title)."""
    # ── package.json ──
    pkg_path = dest / "package.json"
    if pkg_path.exists():
        pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
        pkg["name"] = name
        pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  ✔ package.json → name: {name}")

    # ── client/index.html title ──
    if title:
        html_path = dest / "client" / "index.html"
        if html_path.exists():
            content = html_path.read_text(encoding="utf-8")
            new_content = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", content, count=1, flags=re.S)
            if new_content != content:
                html_path.write_text(new_content, encoding="utf-8")
                print(f"  ✔ client/index.html → <title>{title}</title>")
            else:
                print(f"  ⚠️  <title> non trovato in client/index.html")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clona il QUIZ INTERATTIVO SORGENTE con nuove domande")
    parser.add_argument("--name", required=True, help="Nome nuova app (es. quiz-roma-antica)")
    parser.add_argument("--questions", required=True, help="File JSON con le domande")
    parser.add_argument("--title", default=None, help="Titolo scheda browser (es. 'Quiz Antica Roma')")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="Progetto sorgente")
    parser.add_argument("--adapter", default=None, help="Percorso di change_quiz_theme.py")
    parser.add_argument("--force", action="store_true", help="Sovrascrivi destinazione esistente")
    parser.add_argument("--no-install", action="store_true", help="Salta pnpm install/check")
    args = parser.parse_args()

    # ── Validazioni ──
    name = args.name.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", name):
        bail("Il nome deve contenere solo minuscole, numeri e trattini (es. quiz-roma-antica)")

    questions_path = Path(args.questions)
    if not questions_path.exists():
        bail(f"File domande non trovato: {questions_path}")

    source_str = args.source
    if re.match(r"^(https?://|git@)", source_str):
        # ── Sorgente = repository GitHub: clona la repo in /home/user/_repo_<nome> ──
        tmp_src = Path("/home/user") / f"_repo_{name}"
        if tmp_src.exists():
            shutil.rmtree(tmp_src)
        print(f"\n📦 Clonazione repository sorgente: {source_str}")
        r = subprocess.run(["git", "clone", "--depth", "1", source_str, str(tmp_src)],
                           capture_output=True, check=False)
        if r.returncode != 0:
            bail(f"git clone fallito: {r.stderr.decode(errors='replace')[-400:]}")
        source = tmp_src
        print(f"  ✔ Repository clonata in {tmp_src}")
    else:
        source = Path(source_str)
        if not (source / "package.json").exists():
            bail(f"Sorgente non valido (manca package.json): {source}")

    dest = Path("/home/user") / name
    if dest.exists():
        if not args.force:
            bail(f"La cartella {dest} esiste già. Usa --force per sovrascriverla.")
        shutil.rmtree(dest)

    # ── 1. Copia ──
    print(f"\n📦 Clonazione: {source} → {dest}")
    shutil.copytree(source, dest, ignore=IGNORED, dirs_exist_ok=False)
    print("  ✔ Progetto copiato (esclusi node_modules, .git, dist, zip, guide HTML)")

    # ── 2. Rinomina ──
    print("Rinomina:")
    rename_project(dest, name, args.title)

    # ── 3. git init (per i checkpoint webdev) ──
    subprocess.run(["git", "init"], cwd=dest, capture_output=True, check=False)
    subprocess.run(["git", "add", "-A"], cwd=dest, capture_output=True, check=False)
    subprocess.run(["git", "-c", "user.email=marky@easy-peasy.ai", "-c", "user.name=Marky",
                    "commit", "-m", f"Clone di {source.name} con nuove domande"], cwd=dest,
                   capture_output=True, check=False)
    print("  ✔ Git inizializzato e primo commit creato")

    # ── 4. Cambio domande via adapter ──
    adapter = find_adapter(args.adapter)
    print(f"\n🎯 Applicazione del nuovo set di domande ({questions_path.name}):")
    result = subprocess.run(
        [sys.executable, str(adapter), str(questions_path), "--project", str(dest)],
        check=False,
    )
    if result.returncode != 0:
        bail("change_quiz_theme.py è terminato con errori")

    # ── 5. Installazione e verifica ──
    if args.no_install:
        print("\n⏭️  --no-install: saltati pnpm install e pnpm check")
    else:
        print("\n📥 pnpm install …")
        r = subprocess.run(["pnpm", "install"], cwd=dest, check=False)
        if r.returncode != 0:
            bail("pnpm install fallito")
        print("🔍 pnpm check …")
        r = subprocess.run(["pnpm", "check"], cwd=dest, check=False)
        if r.returncode != 0:
            bail("pnpm check: errori TypeScript — correggere prima del deploy")

    print(f"""
✅ CLONAZIONE COMPLETATA: {dest}

Prossimi passi:
  1. Verifica mirror (devono essere IDENTICI):
       diff {dest}/TeacherPage.tsx {dest}/client/src/pages/TeacherPage.tsx
       diff {dest}/StudentQuiz.tsx {dest}/client/src/pages/StudentQuiz.tsx
       diff {dest}/questions.ts {dest}/server/questions.ts
       diff {dest}/reportPdf.ts {dest}/client/src/lib/reportPdf.ts
  2. Deploy PREVIEW con webdev_deploy (mode=preview) e test visivo
     (apri una classe, entra con uno studente, verifica domande e PDF).
  3. Dopo la conferma dell'utente: webdev_save_checkpoint + deploy PRODUZIONE.
""")

    # ── 6. Verifica mirror automatica ──
    print("Verifica mirror automatica:")
    pairs = [
        (dest / "TeacherPage.tsx", dest / "client/src/pages/TeacherPage.tsx"),
        (dest / "StudentQuiz.tsx", dest / "client/src/pages/StudentQuiz.tsx"),
        (dest / "questions.ts", dest / "server/questions.ts"),
        (dest / "reportPdf.ts", dest / "client/src/lib/reportPdf.ts"),
    ]
    all_ok = True
    for a, b in pairs:
        if a.exists() and b.exists():
            same = a.read_bytes() == b.read_bytes()
            print(f"  {'✅' if same else '❌'} {a.name} ↔ {b.relative_to(dest)}")
            all_ok = all_ok and same
        else:
            print(f"  ⚠️  {a.name} o {b.relative_to(dest)} mancante")
    if not all_ok:
        bail("Alcune coppie mirror NON sono identiche — sincronizzarle prima del deploy")


if __name__ == "__main__":
    main()
