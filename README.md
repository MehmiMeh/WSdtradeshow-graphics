# Graphics HQ — Trade Show Design Coordination

A clean, fast web app for coordinating trade show graphics between coordinators and graphic design managers. Tracks events, design tasks, deadlines, and priorities — no backend or database required.

---

## Features

- **Dashboard** — all events sorted by exhibit submission deadline with countdown alerts and progress bars
- **All Tasks** — master task list across every event, filterable by type, sorted by priority then due date
- **Designer Brief** — auto-generated priority view to share with your design team; one-click copy as plain text
- **Edit tasks** — hover any task to reveal edit and delete icons; update name, type, priority, due date, or notes at any time
- **Priority segmented control** — visual high / medium / low selector that highlights in the matching color
- **Local storage** — all data saves in the browser automatically; no login or server needed
- **Dark mode** — respects system preference automatically
- **Mobile responsive** — works on phones and tablets

---

## Getting started

### Option 1 — Open directly in a browser

Download the three files and double-click `index.html`. No build step required.

### Option 2 — GitHub Pages (recommended)

1. Create a new repository on [github.com](https://github.com)
2. Upload `index.html`, `style.css`, `app.js`, and `README.md` to the root of the repo
3. Go to **Settings → Pages**
4. Set source to `main` branch, `/ (root)` folder, and click **Save**
5. Your live URL will appear on that same page — share it with your team

### Option 3 — Any static host

Upload the three files to Netlify, Vercel, Cloudflare Pages, or any static host.

---

## File structure

```
/
├── index.html   — markup and layout
├── style.css    — all styles (light + dark mode, mobile responsive)
├── app.js       — all logic, data management, and rendering
└── README.md
```

---

## How to use

### 1. Add your events
Click **Add event** on the Dashboard and fill in:
- Event name
- Dates
- Venue / city
- **Exhibit submission deadline** ← drives the countdown alerts
- Notes (booth size, special requirements)

### 2. Add design tasks
Click **+ Task** on any event card (or **Add task** in the All Tasks tab). Set:
- Task name
- Type: Booth graphics, Banner, Flier, Product display, Email blast, Social media, Signage, Other
- Priority: High / Medium / Low
- Due date
- Specs / notes for the designer

### 3. Edit tasks
Hover over any task row to reveal the **edit (pencil)** and **delete (trash)** icons. Click the pencil to open the edit modal with all fields pre-filled — including the priority selector.

### 4. Track progress
- Check the checkbox on any task to mark it complete
- Progress bars on each event card update automatically
- Overdue tasks highlight in red; tasks due within 7 days highlight in amber
- Event cards get a colored left border: green (on track), amber (≤14 days to deadline), red (overdue)

### 5. Share the Designer Brief
Go to the **Designer Brief** tab — it shows all pending tasks grouped by event and sorted high → medium → low priority. Click **Copy brief** to get a plain-text version you can paste into an email, Slack, or Teams message.

---

## Data & privacy

All data is stored in your browser's `localStorage`. Nothing is ever sent to a server. If you clear your browser data the app data will also clear — use **Copy brief** to keep a record if needed.

To share live data between team members, host the app somewhere (GitHub Pages works great) — note that each person's browser maintains its own copy of the data. For true shared/synced data, a backend would be needed.

---

## Customizing task types

Edit the `<select id="mTaskType">` options inside `index.html` to match your workflow.

---

## Browser support

All modern browsers (Chrome, Firefox, Safari, Edge). JavaScript must be enabled.
