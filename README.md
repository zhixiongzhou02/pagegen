# PageGen

PageGen is a Tauri + React desktop app for generating, previewing, editing, and exporting simple page prototypes.

The current codebase is an MVP restored from local history and brought back to a runnable state. Core project flows are available, but real LLM integration is not wired in yet.

## Current MVP

- Create and load projects
- Generate a page from a prompt
- Preview generated HTML live
- Edit page code and save changes
- Persist local app settings
- Export the current page or an entire project
- Run frontend and Rust test suites

## Current Limitation

Prompt-based generation currently uses a local HTML template generator in the Rust backend. Provider settings such as API key, model, and vendor are stored locally, but they are not yet used to call Claude, OpenAI, or any external model API.

## Tech Stack

- Tauri 2
- React 18
- TypeScript
- Vite
- Vitest
- Rust

## Project Structure

```text
.
├── src/                  # React app
│   ├── components/       # UI components
│   ├── services/         # Tauri IPC client layer
│   └── main.tsx          # Frontend entry
├── src-tauri/            # Rust backend
│   ├── src/commands.rs   # Tauri commands
│   ├── src/code_generator.rs
│   ├── src/settings.rs
│   └── src/exporter.rs
└── package.json
```

## Development

Install dependencies:

```bash
npm install
```

Run the desktop app in development:

```bash
npm run tauri dev
```

Build the frontend bundle:

```bash
npm run build
```

Run frontend tests:

```bash
npm test -- --run
```

Run Rust tests:

```bash
cd src-tauri
cargo test --lib
```

## Implemented App Flows

1. App startup loads saved projects and settings.
2. Users can create a project from the sidebar.
3. Prompt submission generates a page and stores the result.
4. The preview pane updates from the current code draft.
5. The code panel supports edit, save, and reset.
6. Settings are stored in the app data directory.
7. Export supports current-page and project-level output.

## Next Logical Step

Replace the local template generator with a real model-backed generation service that reads provider configuration from settings and streams generation results back into the current page.
