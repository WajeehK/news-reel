# News Reel
Installable news PWA with code-made cinematic intros (SVG/CSS, no video files).
- `scripts/fetch_news.py`: free RSS (BBC, Guardian, Sky, NPR, Al Jazeera, CBS, Google News incl. Reuters/AP) -> dedupe, cluster, keyword-classify -> `data/news.json`. Stdlib only, no LLM, no paid APIs.
- `.github/workflows/news.yml`: runs every 15 min on GitHub Actions and deploys to Pages.
- `intros.js` / `intros.css`: one intro template per topic.
