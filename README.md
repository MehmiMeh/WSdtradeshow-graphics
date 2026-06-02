# Trade Show Graphics HQ

A lightweight, single-page web app for trade show coordinators and graphic design managers to track events, design tasks, deadlines, and priorities — no backend or database required.

## Features

- **Dashboard** — all upcoming events sorted by exhibit submission deadline, with countdown alerts and per-event progress bars
- **All Tasks** — master task list across every event, filtered by type, auto-sorted by priority then due date
- **Designer Brief** — auto-generated, copy-ready priority brief to share with your graphic design manager
- **Local storage** — all data saves in the browser automatically; no login or server needed
- **Dark mode** — respects system preference automatically

## Getting started

### Option 1 — Open directly in a browser

Just double-click `index.html`. Everything runs locally with no build step.

### Option 2 — GitHub Pages (recommended for team sharing)

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Your app will be live at `https://<your-username>.github.io/<repo-name>/`

### Option 3 — Any static host

Upload the three files (`index.html`, `style.css`, `app.js`) to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

## File structure

```
tradeshowHQ/
├── index.html   # Markup and layout
├── style.css    # All styles (light + dark mode)
├── app.js       # All logic, data, and rendering
└── README.md
```

## How to use

### 1. Add your events
Click **Add event** on the Dashboard. Fill in:
- Event name
- Dates
- Venue / city
- **Exhibit submission deadline** ← this drives the countdown alerts
- Any notes (booth size, special requirements)

### 2. Add design tasks to each event
Click the **+ Task** button on any event card, or go to the **All Tasks** tab. For each task set:
- Task name
- Type (booth graphics, banner, flier, product display, email blast, social media, signage, other)
- Priority (high / medium / low)
- Due date
- Specs / notes for the designer (dimensions, bleed, file format, brand colors, etc.)

### 3. Track progress
- Check off tasks as they're completed — progress bars update automatically
- Overdue tasks highlight in red, tasks due within 7 days highlight in amber
- Event cards get a colored left border: green (on track), amber (≤14 days), red (overdue or past)

### 4. Share the Designer Brief
Go to the **Designer Brief** tab and click **Copy brief** to get a plain-text summary sorted by event deadline and task priority. Paste it directly into an email or Slack message.

## Data & privacy

All data is stored in your browser's `localStorage`. Nothing is sent to any server. If you clear your browser data, the app data will also be cleared — export your brief as a backup if needed.

## Customizing task types

Edit the `<select id="tType">` options in `index.html` to match your company's workflow.

## Browser support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). JavaScript must be enabled.
