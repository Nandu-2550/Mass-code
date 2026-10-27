# Mass-code // CODEVAULT: Universal Offline-First Competitive Programming & Exam Platform

CODEVAULT is a high-security, offline-first competitive programming and assessment platform patterned after HackerRank. It is engineered specifically for institutional computer science labs operating in zero-internet or intermittent-connectivity environments.

---

## 🏛 Architecture Overview

```
c:\Projects\Mass_code\
├── package.json               # NPM manifest & Electron startup scripts
├── main.js                    # Electron main process: window lifecycle, IPC, OS lockdown & compiler execution
├── preload.js                 # ContextBridge security layer exposing safe IPC channels
├── server.js                  # Standalone/Embedded HTTP host server for config distribution & sync bridge
├── compiler-engine.js         # Offline native C/C++ compiler sandbox (GCC MinGW, stdin/stdout streaming, TLE kill)
├── sample-contest.json        # Bundled sample contest with 3 algorithmic problems & hidden test cases
├── submissions/               # Folder storing immutable student JSON submissions (FINAL_[USN].json)
├── sessions/                  # Folder storing crash-recovery snapshots (SESSION_[USN].json)
├── contests/                  # Exported contest configuration packages (contest-config-*.json)
├── test-compiler.js           # Unit test for MinGW GCC compiler integration & evaluation
├── test-compiler-edge-cases.js# Edge case tests: Time Limit Exceeded (TLE) & syntax compilation errors
├── test-full-system.js        # Full integration test: Host server, LAN pull, sync bridge, grading & tie-breaking
└── src/
    ├── index.html             # Responsive Single-Page UI layout
    ├── styles/
    │   ├── main.css           # Core design system tokens, modals, buttons, alerts, and custom scrollbars
    │   ├── host.css           # Contest builder cards, dynamic test case grid, and leaderboard table styles
    │   └── attender.css       # Split-screen UI, monospace code editor, and green-on-black terminal sandbox
    └── js/
        ├── app.js             # State coordinator, mode router, and supervisor PIN security
        ├── host.js            # Contest builder engine, LAN distribution controls, and grading analyzer
        ├── attender.js        # Monotonic relative execution timer, problem switcher, and test submission
        ├── editor.js          # Monospace editor with line gutter, 4-space tab indentation, and clipboard blocking
        ├── compiler.js        # Green terminal sandbox runner & live progress stream
        ├── antiCheat.js       # Window blur/focus watcher, shortcut interceptors, and 3-strike lockout
        └── syncBridge.js      # Session snapshotting and HTTP POST sync recovery bridge
```

---

## ⚡ Core Operational Modes

### 1. Host Mode (Contest Management & Grading)
- **Visual Contest Builder**:
  - Configure Contest Metadata: Title, alphanumeric tracking PIN / ID token, and countdown limit (in minutes).
  - Multi-Problem Stack: Dynamically add/remove algorithmic problems (Title, Description, Max Points, Time Limit, Starter Code).
  - Dynamic Test Cases Array: Define multiple distinct input strings and expected output tokens; designate cases as either **Sample** (visible in statement) or **Hidden** (evaluated during grading).
  - Export: Compile into a lightweight `contest-config.json` package and export to disk.
- **LAN Distribution & Sync Server**:
  - One-click HTTP server on port `4500` that broadcasts the active contest over the lab's local area network.
  - Automatically identifies local IPv4 endpoints (e.g. `http://192.168.1.5:4500`) for students to connect to.
  - Serves `GET /api/contest/:code` and accepts submissions at `POST /api/contest/sync-submission`.
- **Grading Reporter Module**:
  - Scans a folder containing student log files (`FINAL_[USN].json`).
  - **Competitive Sorting Rules**:
    1. Highest Total Score first.
    2. Ties broken by **Fastest CPU Execution Time** (in milliseconds).
    3. Further ties broken by Contest Elapsed Time.
  - Generates a visual Leaderboard with rank badges (#1 Gold, #2 Silver, #3 Bronze).
  - One-click export to a formatted CSV spreadsheet (`Leaderboard_[Contest]_[Timestamp].csv`).
  - Built-in Submission Inspector modal to review student source code, test execution logs, and cheating audit trail.

---

### 2. Attender Mode (Test Taker Environment)
- **PIN Initialization & Institutional Registration**:
  - Student enters the Contest Code (e.g., `ALGO26X1`) and connects over LAN to pull down the configuration package, or imports a local configuration file.
  - Validates student institutional identifier (USN / Reg No) and Name.
  - Performs environment diagnostics (checks MinGW GCC availability).
- **Split-Screen UI Layout**:
  - **LEFT PANEL**: Displays Problem Statement, Constraints, Input/Output specifications, Sample Test Cases, and real-time Execution Metrics (Score, Tests Passed, CPU Execution Time, Violation Strikes).
  - **RIGHT PANEL**: Monospace Code Editor pane with line numbering and a bottom-anchored running green-on-black terminal output sandbox.
- **Isolated Relative Execution Timer**:
  - Driven strictly by a monotonic relative uptime counter (`setInterval` ticking uptime seconds) independent of the OS system date or wall-clock time, rendering system clock tampering attacks ineffective.
  - Countdown displayed in format `HH:MM:SS` in the top navigation bar.
  - Turns warning red when under 5 minutes; automatically submits when the countdown finishes.
- **"Run Test Cases" Execution Sandbox**:
  - Quietly dumps current code to an isolated temporary file (`temp/eval_[timestamp].c`).
  - Invokes the native system compiler: `gcc -O2 temp.c -o temp.exe`.
  - Streams compilation stdout/stderr directly into the green-on-black terminal sandbox.
  - Sequentially feeds inputs via standard input (`stdin.write()`), enforces timeout per test case (default 2000ms to terminate infinite loops / TLE), normalizes output tokens, and computes score fractions dynamically.
- **Continuous Session Snapshots**:
  - Automatically writes execution snapshots to `sessions/SESSION_[USN].json` after every run and code change. If power drops, re-entering the USN restores code, scores, and timer state seamlessly.

---

## 🛡 Cheating Protection Primitives

1. **Active Fullscreen Environment**:
   - `mainWindow.setFullScreen(true)`, `mainWindow.setAlwaysOnTop(true, 'screen-saver')`, and optional kiosk mode lock down the station viewport.
2. **Keyboard Shortcut Interception**:
   - Global shortcuts and `before-input-event` listeners block `Alt+Tab`, `Alt+F4`, `Ctrl+Shift+I`, `F12` (DevTools), `F11` (Fullscreen toggle), `F5` / `Ctrl+R` (Page Reload), and `Ctrl+W`.
3. **Window Blur & Focus Monitoring**:
   - Event listeners watch window blur and visibility changes. Moving focus away from the application viewport triggers an immediate timestamped security audit log entry and increments the student's violation strikes.
   - Shows a security siren warning modal. If 3 strikes are reached, the station enters full Lockdown, requiring the Host Supervisor Master PIN (`ADMIN123`) to restore access.
4. **Strict Clipboard Hijacking Prevention**:
   - Intercepts and cancels `copy`, `cut`, `paste`, `beforecopy`, `beforepaste` events on the code editor.
   - Blocks `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+Insert`, and `Shift+Insert`.
   - Disables right-click context menus (`oncontextmenu="return false;"`) and drag-and-drop operations.

---

## 📡 Network Sync Bridge

1. **Session Finalization**:
   - Upon timer expiry or manual submission, packages all code structures, test case evaluation matrices, score objects, and violation audit logs into an immutable file: `submissions/FINAL_[USN].json`.
2. **Offline Recovery Sync**:
   - Pushes the payload via HTTP POST to `http://<host-ip>:4500/api/contest/sync-submission`.
   - If network connectivity is down, flags the payload as `SAVED_OFFLINE_PENDING_SYNC` with zero data loss.
   - When network connectivity returns, the recovery sync utility automatically loops through pending files and pushes them to populate the global Host leaderboard.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.14.1)
- **C/C++ Compiler**: MinGW GCC 6.3.0+ in system `PATH` (`gcc --version`)

### Quick Launch
```bash
# 1. Install dependencies
npm install

# 2. Verify native GCC compiler integration
npm run test:compiler

# 3. Launch CodeVault desktop application
npm start
```

### Supervisor Master PIN
- Default Invigilator Supervisor PIN: `ADMIN123`
