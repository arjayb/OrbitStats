# OrbitStats — Contributor Analytics Dashboard

A blueprint-style analytics dashboard for any public GitHub repository:
weekly commit activity over the last year, language composition, and a
ranked contributor leaderboard — all rendered as hand-drawn-feeling SVG
charts with zero charting library.

**Live demo:** _add your GitHub Pages link here_

## Why this project

GitHub's own "Insights" tab is buried a few clicks deep and split across
several pages. OrbitStats pulls the numbers that actually matter for
evaluating a project's health — activity trend, language mix, who's doing
the work — onto one screen.

## Features

- Commit-frequency bar chart, 52 weeks, built from GitHub's contributor
  stats endpoint
- Language composition bar with percentage breakdown
- Top-8 contributor leaderboard with proportional bars
- Handles GitHub's async stats computation (`202` responses) with polling
  and a friendly wait message
- No backend, no build step, no charting dependency — pure SVG

## Tech stack

- Vanilla JavaScript (ES2020+)
- Native SVG for all charts
- [GitHub REST API](https://docs.github.com/en/rest) — unauthenticated

## Running locally

```bash
git clone https://github.com/arjayb/OrbitStats.git
cd OrbitStats
npx serve .
```

## Known limitations

- Unauthenticated requests are capped at 60/hour per IP by GitHub
- Very large or very old repositories can take a moment for GitHub to
  compute contributor stats on first request
- Contributor leaderboard is capped at the top 8 for legibility

## Possible next steps

- Toggle between weekly and monthly aggregation
- Export the dashboard as a shareable PNG
- Compare two repositories side by side

## License

MIT
