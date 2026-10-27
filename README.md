# Mass-Code // Universal Offline Competitive Programming & Assessment Platform

Mass-Code is a production-grade, offline-first competitive programming and assessment platform patterned after HackerRank. It is engineered specifically for institutional computer science laboratories operating in zero-internet or intermittent-connectivity environments.

---

## 🏛 Directory Architecture Blueprint

```
c:\Projects\Mass_code\
├── package.json              # Project identity & Electron launch configuration
├── run-mass-code.bat         # Zero-installation click-to-run USB execution bundle
├── main.js                   # Window lifecycle, OS detection, security rules & compiler sandbox
├── preload.js                # ContextBridge security layer exposing safe IPC channels
├── index.html                # Dynamic multi-view view router (Welcome, Host, Competitor, Thank You)
├── renderer.js               # Application state, timer latches, multi-tier question bank & sync
├── styles.css                # High-contrast modern dark UI layout system
├── assets/
│   ├── logo.png              # Designated branding media artifact (512x512 RGBA)
│   ├── favicon.png           # Browser & view tab favicon (64x64 RGBA)
│   ├── favicon.ico           # Windows multi-resolution icon
│   └── logo-full.png         # Complete branding lockup with typography
├── launch_masscode.bat       # Windows desktop launcher
├── launch_masscode.sh        # Linux executable desktop shell launcher
├── setup_env.bat             # Automated USB deployment & verification script for Windows
├── setup_env.sh              # Automated USB deployment & verification script for Linux
├── sample-contest.json       # Bundled multi-tier contest configuration (Easy, Medium, Hard)
├── contests/                 # Exported contest packages
├── sessions/                 # Continuous autosave snapshots (SESSION_[USN].json)
├── submissions/              # Immutable finalized submissions (FINAL_[USN].json)
└── synced_submissions/       # Live LAN-synchronized candidate results (FINAL_[USN].json)
```

---

## ⚡ Operational Modes & Security Access Rules

### 1. Landing Dashboard (Mode Selection Welcome Screen)
- Displays the **Mass-Code** branding logo (`assets/logo.png`), introduction, and system diagnostics.
- Presents exactly two primary operational module cards:
  - **[Host Mode]**
  - **[Competitor Mode]**

### 2. Host Mode (Full Computing Freedom & LAN Distribution)
- Granted full computing freedom:
  - Unconfined, resizable, and minimizable window.
  - Can switch between native tabs, desktop software, or background apps without restrictions (`Alt+Tab` operates freely).
- Features:
  - Multi-tier Contest Builder with Easy, Medium, and Hard problem assignments.
  - Test case authoring with Sample vs. Hidden flags.
  - Embedded LAN distribution server on port `8080` with local IP discovery and automated UDP broadcasting (`dgram` on port `45454`).
  - Automated sync endpoint (`POST /sync-result`) safely writing incoming candidate payloads to `synced_submissions/`.
  - Live competitive grading scanner with tie-breaking rules (Highest Score first, ties broken by Fastest CPU Execution Time) and CSV spreadsheet export.

### 3. Competitor Mode (Strict Kiosk Confinement Framework)
- Triggered upon entering Competitor Mode:
  - Enforces fullscreen kiosk environment (`fullscreen: true`, `alwaysOnTop: true`, `kiosk: true`).
  - Intercepts and terminates OS environment switching shortcuts (`Alt+Tab`, `Alt+F4`, Windows Key, `Ctrl+Shift+I`, `F12`, `F11`, `Ctrl+R`, `Ctrl+W`).
  - Strict clipboard protection: `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, and right-click context menus are blocked inside the code editor.
  - Window blur detection: logs incidents, strikes, and warning alerts.
- **Release Conditions**: The student can ONLY regain full system access under two conditions:
  1. Clicking **"End Session"** (displays confirmation modal, packages final answers, lifts kiosk confinement, and shows "Thank You for Participating" screen).
  2. Inputting the parameterized **Supervisor Emergency Key** (`GECM@8123`).

---

## 🎯 Multi-Tier Question Bank & Workflow

- **Multi-Tier Context Control**:
  - Left panel provides 3 tier navigation choices: **"Easy"**, **"Medium"**, and **"Hard"**.
  - Shows problem count and verified solved progress per tier (e.g. `Easy (2/2 Verified)`).
- **Right-Hand Question Matrix**:
  - Dynamically renders problem cards belonging to the selected tier.
  - **Status Indicator Tagging** directly below each problem title:
    - ⚪ `Not Attempted`: problem has not been opened or attempted yet.
    - 🟡 `Attempting / Saved`: candidate has written or autosaved code.
    - 🟢 `Passed Verification`: 100% test cases verified and passed.
- **Problem Workspace**:
  - Split view containing Markdown problem description, constraints, sample test cases, and execution metrics.
  - Right panel features C (GCC Native Sandbox) code editor with line gutter and 4-space tab indentation.
  - Bottom-anchored running green-on-black terminal output sandbox with streaming compilation error diagnostics, test execution results, sample diffs, and execution timing.
- **Continuous Session Snapshots**:
  - Autosaves every edit to `sessions/SESSION_[USN].json` to guarantee zero data loss during power outages.

---

## ⏱ Timed Latches & Session Finalization

1. **Isolated Monotonic Relative Timer**:
   - Driven by an internal relative uptime counter (`setInterval`) decoupled from the OS desktop clock, preventing system time tampering.
   - Shows countdown in format `HH:MM:SS`.
2. **Automated Timeout Safety**:
   - When the countdown drops to zero, the platform immediately captures all code across all tiers, forces an automated backup save (`FINAL_[USN].json`), bypasses warning prompts, lifts kiosk mode, and advances straight to the "Thank You for Participating" validation screen.
3. **End Session Action**:
   - Globally accessible button. Shows explicit confirmation warning.
   - On confirmation, finalizes all solutions into `submissions/FINAL_[USN].json`, syncs via HTTP POST to the Host server, lifts kiosk confinement, and displays the "Thank You" summary.

---

## 🚀 Instant Launch

- **Windows**: Double-click `launch_masscode.bat` or run:
  ```cmd
  npm start
  ```
- **Linux**: Run:
  ```bash
  chmod +x launch_masscode.sh
  ./launch_masscode.sh
  ```

---

## 🔑 Supervisor Credentials
- **Supervisor Emergency Override Key**: `GECM@8123`
