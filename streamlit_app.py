from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent


def read_text(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def inline_site() -> str:
    html = read_text("index.html")
    css = read_text("styles.css")
    data = read_text("skills-data.js")
    app = read_text("app.js")

    html = html.replace('<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>")
    html = html.replace('<script src="skills-data.js"></script>', f"<script>{data}</script>")
    html = html.replace('<script src="app.js"></script>', f"<script>{app}</script>")
    return html


st.set_page_config(
    page_title="Skill Atlas",
    page_icon="SA",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      .block-container { padding: 0; max-width: 100%; }
      header[data-testid="stHeader"] { display: none; }
      div[data-testid="stToolbar"] { display: none; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(inline_site(), height=1200, scrolling=True)
