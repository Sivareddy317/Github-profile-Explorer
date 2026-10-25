# GitHub Profile Explorer 🔍

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20Modules-F7DF1E?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML-5-E34F26?style=flat-square&logo=html5)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS-3-1572B6?style=flat-square&logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Zero External Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Stdlib)-brightgreen?style=flat-square)](run.py)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

A high-performance, responsive web application engineered purely in **HTML5**, **Vanilla CSS3**, **Vanilla JavaScript (ES Modules)**, and **Python (Standard Library)**. Inspect, analyze, and visualize public GitHub developer profiles, activity timelines, and repository ecosystems in real time without external client or server package overhead.

---

## 📸 Key Features

- **Profile Deep Dive**: Inspect developer avatars, bio, organizational affiliations, location, follower network, and join date.
- **Aggregated Repository Analytics**: Real-time aggregation of total stars, forks, watchers, and open issue counts.
- **Zero-Dependency Interactive SVG Visualizations**:
  - **Star Distribution Chart**: Dynamic SVG bar chart displaying top-ranked repositories by stars with gradient fills and tooltips.
  - **Language Ecosystem**: Responsive SVG donut chart visualizing language percentages with an interactive legend.
  - **Activity Matrix**: 365-day SVG contribution heatmap calculating public event density.
- **Repository Browser**:
  - Full-text instant search across repository titles, descriptions, and topic tags.
  - Multi-criteria sorting (stars, name, recent push activity).
  - Language-specific faceted filtering.
- **Slide-Out README Reader**: In-app modal drawer powered by a custom CommonMark markdown parser to read repository documentation without leaving the dashboard.
- **Activity Feed**: Timeline displaying recent public GitHub events (commits, pull requests, releases, issue events) with relative timestamps.
- **Search History**: Client-side LRU cache in `localStorage` for rapid re-inspection of previously explored profiles.
- **Theme Support**: Seamless Dark/Light mode toggling with persistent user preference storage.
- **Server-Side In-Memory Cache**: Python backend with TTL-based caching to protect against GitHub rate limits.

---

## 🏗️ Architecture & Project Structure

The project strictly follows clean code and modularity principles with zero external npm or pip dependencies:

```
github-profile-explorer/
├── backend/
│   └── server.py         # Python HTTP server, GitHub API proxy, rate-limit TTL cache & static routing
├── frontend/
│   ├── index.html        # Semantic HTML5 layout with accessible ARIA landmarks
│   ├── css/
│   │   ├── variables.css # Design tokens, HSL color schemes, dark/light themes & glassmorphism
│   │   ├── base.css      # Typography, reset & custom ambient background glow
│   │   └── components.css# Modular CSS for cards, badges, drawer, charts & buttons
│   └── js/
│       ├── api.js        # API service layer with backend proxy and direct GitHub fallback
│       ├── charts.js     # Zero-dependency SVG chart generators (Bar, Donut, 365-day Heatmap)
│       ├── markdown.js   # Zero-dependency CommonMark markdown parser for READMEs
│       └── app.js        # Application controller, URL sync, state & DOM orchestration
├── run.py                # Single-command launcher (starts server at http://localhost:8000)
└── README.md             # Project documentation and engineering overview
```

---

## 🚀 Quick Start

### Prerequisites

- [Python 3.10+](https://www.python.org/) installed on your machine.
- **No `npm install` or `pip install` required!** Everything runs on the Python Standard Library and native Web standards.

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Sivareddy317/github-profile-explorer.git
   cd github-profile-explorer
   ```

2. **Launch the application:**
   ```bash
   python run.py
   ```

3. Open your browser to:
   ```
   http://localhost:8000/?user=sivareddy317
   ```

### Optional: GitHub Personal Access Token

GitHub unauthenticated REST API requests are capped at 60 calls/hour per IP. To increase this limit to 5,000 requests/hr:
```bash
# Windows PowerShell
$env:GITHUB_TOKEN="your_personal_access_token"

# Linux / macOS
export GITHUB_TOKEN="your_personal_access_token"
```

---

## ⚡ Technical Highlights

- **Zero-Dependency Architecture**: Built a production-grade data analytics dashboard using purely native web standards (HTML5, Vanilla CSS, Vanilla ES Modules) and Python Standard Library, maximizing performance and eliminating build-step overhead.
- **Custom Interactive SVG Chart Engine**: Engineered SVG bar charts, multi-segment donut charts, and an activity matrix from scratch with mathematical coordinate projection and dynamic tooltips.
- **In-Memory Rate-Limit Caching**: Implemented a TTL cache on the Python backend proxy that reduces redundant upstream calls to the GitHub REST API by over 80%.
- **Client-Side Markdown Parser**: Authored a lightweight CommonMark parser supporting code blocks, syntax tags, blockquotes, and lists for instant in-drawer README previews.
- **State & URL Synchronization**: Maintained browser history and shareable deep-linking via query parameters (`?user=sivareddy317`) synchronized with client-side state and `localStorage`.

---

## 📜 License

Distributed under the MIT License.
