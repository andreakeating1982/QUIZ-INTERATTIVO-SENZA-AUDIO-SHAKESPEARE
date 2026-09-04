# 🚀 RENDER — Trasferire l'app da Easy-Peasy AI a Render (via GitHub)

> **Obiettivo:** portare il QUIZ INTERATTIVO SORGENTE (o una sua variante clonata) dall'ambiente
> Easy-Peasy AI a **Render** (hosting gratuito: web service Docker + database PostgreSQL), passando
> da una **repository GitHub**.
>
> Il pacchetto contiene già tutto il necessario: `render.yaml` (Blueprint), `deploy/Dockerfile.render`
> (multi-stage: build + migrazioni), `.env.example`, `deploy/` e le guide utente (`GUIDA-RENDER.html`).
>
> ⚠️ **Tre Dockerfile, tutti con build dal sorgente:** il `Dockerfile` a ROOT è usato da
> `docker-compose.yml` (`build: .`) e dai deploy generici; `deploy/Dockerfile` è l'equivalente per
> chi usa `-f deploy/Dockerfile`; per **Render** il Dockerfile corretto è `deploy/Dockerfile.render`
> (multi-stage: builda tutto lui, esegue `drizzle-kit push` all'avvio) — ed è ciò che `render.yaml`
> referenzia. Nessuno dei tre richiede `dist/` committata: la generano dentro il container con
> `pnpm build`.

---

## 1. Cosa serve

- Un account **GitHub** (gratuito).
- Un account **Render** (gratuito, si collega con GitHub — nessuna carta richiesta per il piano free).
- Il pacchetto ZIP esportato (o la cartella del progetto).

---

## 2. Panoramica del metodo (Blueprint)

`render.yaml` crea in automatico:

1. Un **database PostgreSQL gratuito** (`quiz-db`, 1 GB, regione Frankfurt).
2. Un **Web Service Docker** che builda l'app con `deploy/Dockerfile.render` (multi-stage).
3. Collega `DATABASE_URL` al database e genera `BETTER_AUTH_SECRET` da solo.

Quindi su Render non serve creare manualmente né DB né variabili: basta collegare la repo.

---

## 3. Passo 1 — Prepara il repository su GitHub

1. Vai su [github.com](https://github.com) → **+** → **New repository**.
2. Nome es. `quiz-interattivo` → **Public** (o Private, purché Render vi abbia accesso) →
   **Create repository**.
3. Carica il contenuto del pacchetto ZIP (estratto) oppure fai push dalla cartella locale:

```bash
cd /home/user/shakespeare-quiz          # oppure la cartella della variante clonata
git init
git add .
git commit -m "Quiz Interattivo Sorgente"
git branch -M main
git remote add origin https://github.com/IL-TUO-UTENTE/IL-TUO-REPO.git
git push -u origin main
```

> ⚠️ **Non caricare `.env`**: è già in `.gitignore`, quindi `git add .` non lo include. I segreti su
> Render li genera il Blueprint.

---

## 4. Passo 2 — Collega Render al repository (Blueprint)

1. Vai su [dashboard.render.com](https://dashboard.render.com).
2. **New +** → **Blueprint**.
3. Connetti l'account GitHub (se non l'hai già fatto) e scegli la repository appena creata.
4. Render legge `render.yaml` e propone: database `quiz-db` + web service.
5. Clicca **Apply** e attendi 3-6 minuti (build Docker + migrazioni).

Al termine vedrai `✓ Service is live`. L'URL sarà simile a:
`https://quiz-interattivo.onrender.com` (Render lo genera dal nome; lo puoi personalizzare da
**Settings → Service → Service name**).

---

## 5. Passo 3 — Verifica che tutto funzioni

- Apri `https://IL-TUO-APP.onrender.com` → deve comparire la prima pagina del quiz.
- Apri `https://IL-TUO-APP.onrender.com/docente` → crea una classe e avvia una sessione.
- Apri `https://IL-TUO-APP.onrender.com/quiz` → unisciti con nome + codice.
- Scarica un **report PDF** → verifica il riquadro PUNTEGGIO.
- Health check automatico: Render usa `/_health` (endpoint già presente nel server).

> 💡 **Migrazioni DB**: `deploy/Dockerfile.render` esegue `drizzle-kit push` all'avvio del container
> (vedi `CMD`), quindi le tabelle vengono create/applicate da sole al primo deploy. Se aggiungi una
> migrazione in futuro, basta un nuovo push su GitHub → Render rebuilda e riapplica.

---

## 6. Variante: creare una NUOVA app con domande diverse e portarla su Render

1. Clona il sorgente con la skill `quiz-interattivo-sorgente`:
   ```bash
   python skills/quiz-interattivo-sorgente/scripts/clone_quiz_app.py \
     --name quiz-roma-antica \
     --questions /percorso/domande.json \
     --title "Quiz Antica Roma" \
     --source https://github.com/IL-TUO-UTENTE/IL-TUO-REPO
   ```
   La nuova app nasce in `/home/user/quiz-roma-antica` con domande nuove (e, se richieste, la nuova
   tipologia — vedi `ADATTARE.md`).
2. Ripeti i passi 3-4 per la nuova cartella (repo nuova → Render Blueprint).
3. Il `render.yaml` dentro la variante è già pronto (stesso schema del sorgente).

---

## 7. Personalizzazioni rapide dopo il deploy

| Cosa | Dove |
|---|---|
| Nome app / URL | Render → Service → Settings |
| Titolo nella scheda browser | `client/index.html` → `<title>` (poi push su GitHub) |
| Titolo PDF | nel JSON delle domande (`title`) o con `change_quiz_theme.py` |
| Database più grande | Render → Database → Plan (pagato, opzionale) |
| Dominio personalizzato | Render → Service → Settings → Custom Domain |

---

## 8. Se preferisci NON usare il Blueprint (deploy manuale)

1. **New +** → **Web Service** → connetti la repo → Runtime **Docker** → **Free**.
2. **New +** → **PostgreSQL** → **Free**.
3. Nel Web Service aggiungi le variabili d'ambiente:
   - `NODE_ENV=production`
   - `BETTER_AUTH_SECRET` (genera con `openssl rand -base64 32`)
   - `DATABASE_URL` = connection string del database creato al punto 2
4. Deploy. Il container builda con `deploy/Dockerfile.render` ed esegue le migrazioni all'avvio.

---

## 9. Risoluzione problemi

| Problema | Causa probabile | Soluzione |
|---|---|---|
| Build fallisce su `pnpm` | Lockfile/versione pnpm | `deploy/Dockerfile.render` usa `corepack enable pnpm`; se serve, impostare `packageManager` corretti in `package.json` |
| Container muore all'avvio | `DATABASE_URL` mancante | Verificare che il Web Service abbia la var collegata al DB |
| `drizzle-kit push` errore | DB non raggiungibile | Verificare la connection string e che il DB sia nello stesso account/regione |
| Pagina bianca | Build client non servita | Verificare che `dist/public/index.html` esista nel container; riavviare il service |
| Font non caricati su Blogger | CORS | Il server espone già `/fonts` con `Access-Control-Allow-Origin: *`; usare la cornice dinamica aggiornata (vedi `cornice-dinamica/`) |

---

## 10. Dopo il deploy: embed su Blogger con la cornice dinamica

Nella cartella `cornice-dinamica/` trovi gli embed pronti. **Attenzione:** contengono l'URL del
sorgente (`https://shakespeare-quiz.easy-peasy.site`). Per la NUOVA app su Render:

1. Apri `cornice-dinamica/embed-shakespeare-quiz-dedicata.html` (versione consigliata).
2. Sostituisci in cima allo script:
   ```js
   var APP_URL = 'https://shakespeare-quiz.easy-peasy.site/';
   ```
   con l'URL Render della nuova app:
   ```js
   var APP_URL = 'https://quiz-roma-antica.onrender.com/';
   ```
3. (Opzionale) adatta titolo e colori al tema della nuova app.
4. Incolla l'intero contenuto del file nella vista HTML del post Blogger.

L'iframe si adatta da solo all'altezza (protocollo `labvisivo:height` + anti-loop) e i font
OpenDyslexic vengono serviti con CORS dal server.

---

## 11. File di riferimento inclusi nel pacchetto

| File | Scopo |
|---|---|
| `render.yaml` | Blueprint Render (DB + Web Service) |
| `deploy/Dockerfile.render` | ✅ Dockerfile per Render: multi-stage + migrazioni automatiche (referenziato da `render.yaml`) |
| `Dockerfile` | Build completo dal sorgente (install + `pnpm build` + migrazioni all'avvio) — usato da `docker-compose.yml` (`build: .`) |
| `deploy/Dockerfile` | Equivalente al root (per `docker build -f deploy/Dockerfile`) |
| `deploy/docker-entrypoint.sh` | Esegue `drizzle-kit push` poi avvia il server (usato da tutti i Dockerfile) |
| `deploy/docker-compose.yml` | Avvio locale con PostgreSQL (`docker compose up -d`) |
| `.dockerignore` | Esclude node_modules/.git/dist/.env e guide pesanti dal contesto di build |
| `.env.example` | Variabili minime per deploy manuale |
| `setup.sh` | Genera un `BETTER_AUTH_SECRET` sicuro |
| `GUIDA-RENDER.html` / `GUIDA-UNICA.html` | Guide visuali passo-passo |
