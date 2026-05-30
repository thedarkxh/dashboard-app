# Hermes Dock (Agy & Hermes OS)

A high-performance, local Electron-based dashboard application built with React and Vite. It serves as a unified workspace featuring a multi-agent task delegator, a multiplexed terminal, and a browser hub.

## Features

- **Agent Workspace Task Manager:** A fully functional local AI task delegator. Create tasks and watch as background agents pick them up, execute them, and report back. If an agent needs more information, an inline reply box automatically appears for you to provide context.
- **Terminal Multiplexer:** High-performance local shell tabs powered by `xterm.js` and `node-pty`. Isolated instances with flawless resizing, auto-copy on selection, and rock-solid state management to prevent zombie processes and ghost cursors.
- **Browser Hub:** Embedded webviews for fast context switching with global hotkeys (e.g., F11 for native app fullscreen, Alt+Shift+F for browser fullscreen, Ctrl+I for URL introspection). Includes custom ad-blocking for a clean browsing experience.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thedarkxh/dashboard-app.git
   cd dashboard-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

## Key Bindings
- **F11:** Toggle native application fullscreen.
- **Alt + Shift + F:** Toggle Browser fullscreen mode.
- **Ctrl + I:** Reveal current active URL in Browser mode.

## Version
**v0.1** - Initial Dashboard Architecture

## License
MIT
