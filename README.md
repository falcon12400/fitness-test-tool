# Fitness Test Tool

This folder contains a lightweight React + Vite project for managing student fitness test records, along with the planning documents used to shape the first version.

## Run the App

```bash
pnpm install --ignore-workspace
pnpm dev
```

Then open the local URL shown by Vite in the terminal.

## Open the Built App Directly

If you want to open the app without running a local dev server:

```bash
pnpm build
```

After that, open:

- `dist/index.html`

Do not open the source `index.html` in the project root. That file is the Vite entry page and expects a dev server or a built deployment target.

## GitHub Pages

This project now uses relative asset paths, so the built output is suitable for GitHub Pages and for opening `dist/index.html` locally.

## Documents

- `docs/product-spec.md`: first-version product scope and feature rules
- `docs/excel-import-export.md`: Excel import/export contract and hidden JSON strategy
- `docs/implementation-notes.md`: suggested technical direction and phased rollout

## Current App Scope

The first version keeps the web app as the only official editing surface and includes a working prototype for:

- Users edit data in the web app
- Excel is used for viewing, backup, printing, and transfer
- Re-imported Excel files use embedded JSON as the source of truth
- Direct Excel edits are not part of the first-version workflow
- Local browser storage for simple persistence
- Radar chart analysis for a selected record
