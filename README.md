# Skill Atlas

Skill Atlas is a searchable and network-browsable catalog of AI agent skills for Claude Code, Codex, Cursor, Gemini CLI, and related agents.

It also includes a Context Disclosure panel: paste a task or project request, and the atlas recommends matching skills plus a compact context block you can paste into an AI agent before it starts work.

## Run Locally

Use an HTTP server instead of opening `index.html` directly. Some browsers block storage and hash navigation under `file://`.

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Run With Streamlit

```powershell
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Refresh Skill Data

The primary source Markdown is stored in `sources/awesome-agent-skills.md`. The skills.sh top 2% snapshot is stored in `sources/skills-sh-top.json`.

```powershell
node fetch-skills-sh-top.mjs
node build-data.mjs
```

## Publish

Good free options:

- Streamlit Community Cloud: simplest for `streamlit_app.py`.
- GitHub Pages: simplest for the static `index.html`, `app.js`, `styles.css`, and `skills-data.js`.
- Cloudflare Pages or Netlify: also good for a static version with custom domains.

For Streamlit Community Cloud, push this folder to GitHub, create a new app, and set the main file to `streamlit_app.py`.
