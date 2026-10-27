#!/bin/bash
# ==============================================================================
# BUG BUSTERS // AUTOMATED LAB ENVIRONMENT DEPLOYMENT SCRIPT (LINUX)
# Universal Offline Competitive Programming Setup
# Designed to execute from central USB drive to configure student lab machines.
# ==============================================================================

# ANSI Terminal Color Tokens
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Determine Script / USB Source Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/home/$USER/Desktop/BugBusters_Local"
DESKTOP_DIR="/home/$USER/Desktop"
REPORT_FILE="$TARGET_DIR/env_report.txt"

APP_READY="READY"
GCC_STATUS="NOT_FOUND"
GCC_VERSION="MISSING"
NODE_STATUS="NOT_INSTALLED_OPTIONAL"

echo -e "${CYAN}${BOLD}"
echo "==============================================================================="
echo "   ____  _   _  ____   ____  _   _ ____ _____ _____ ____  ____  "
echo "  | __ )| | | ||  _ \ | __ )| | | / ___|_   _| ____|  _ \/ ___| "
echo "  |  _ \| | | || |_) ||  _ \| | | \___ \ | | |  _| | |_) \___ \ "
echo "  | |_) | |_| ||  _ < | |_) | |_| |___) || | | |___|  _ < ___) |"
echo "  |____/ \___/ |_| \_\|____/ \___/|____/ |_| |_____|_| \_\____/ "
echo ""
echo "   AUTOMATED LAB ENVIRONMENT VERIFICATION & DEPLOYMENT UTILITY (LINUX)"
echo "==============================================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. VERIFY FILE-SYSTEM PERMISSIONS & STRUCTURAL WRITE ACCESS
# ------------------------------------------------------------------------------
echo -e "${CYAN}[INFO] Step 1/5: Verifying user environment and directory permissions...${NC}"

# Verify active user home and desktop writable access
if [ ! -d "$HOME" ] || [ ! -w "$HOME" ]; then
    echo -e "${RED}[ERROR] FATAL: Active user home directory '$HOME' is not writable!${NC}"
    APP_READY="FAILED"
    exit 1
fi

# Ensure Desktop directory exists
if [ ! -d "$DESKTOP_DIR" ]; then
    echo -e "${YELLOW}[WARNING] Desktop folder not found. Creating '$DESKTOP_DIR'...${NC}"
    mkdir -p "$DESKTOP_DIR" 2>/dev/null || {
        echo -e "${RED}[ERROR] Failed to create desktop directory.${NC}"
        APP_READY="FAILED"
        exit 1
    }
fi

TEST_TMP_DIR="$DESKTOP_DIR/.bb_perm_probe_$$"
if mkdir -p "$TEST_TMP_DIR" 2>/dev/null && touch "$TEST_TMP_DIR/probe.test" 2>/dev/null; then
    rm -rf "$TEST_TMP_DIR"
    echo -e "${GREEN}[SUCCESS] Structural read, write, and execution verified for user '$USER'.${NC}"
else
    echo -e "${RED}[ERROR] Insufficient permissions to create and write to '$DESKTOP_DIR'.${NC}"
    APP_READY="FAILED"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. CHECK AND CONFIGURE GCC COMPILER VIA SYSTEM REPOSITORIES
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[INFO] Step 2/5: Checking for native C/C++ GCC compiler...${NC}"

# Check GCC availability via command hashing
if command -v gcc >/dev/null 2>&1; then
    GCC_VERSION=$(gcc --version | head -n 1)
    GCC_STATUS="GLOBAL_ACTIVE"
    echo -e "${GREEN}[SUCCESS] GCC compiler is available globally:${NC}"
    echo -e "          $GCC_VERSION"
else
    echo -e "${YELLOW}[WARNING] GCC compiler is missing from the active PATH.${NC}"
    echo -e "${CYAN}[INFO] Invoking package manager to pull compilation dependencies (build-essential)...${NC}"

    if command -v apt-get >/dev/null 2>&1; then
        echo -e "${CYAN}[INFO] Running 'sudo apt-get update && sudo apt-get install build-essential -y'...${NC}"
        sudo apt-get update && sudo apt-get install build-essential -y
    elif command -v dnf >/dev/null 2>&1; then
        echo -e "${CYAN}[INFO] Running 'sudo dnf groupinstall \"Development Tools\" -y'...${NC}"
        sudo dnf groupinstall "Development Tools" -y
    elif command -v pacman >/dev/null 2>&1; then
        echo -e "${CYAN}[INFO] Running 'sudo pacman -S --needed base-devel --noconfirm'...${NC}"
        sudo pacman -S --needed base-devel --noconfirm
    else
        echo -e "${RED}[ERROR] Supported package manager (apt/dnf/pacman) not identified.${NC}"
    fi

    # Re-verify post-installation
    if command -v gcc >/dev/null 2>&1; then
        GCC_VERSION=$(gcc --version | head -n 1)
        GCC_STATUS="INSTALLED_VIA_PKG_MGR"
        echo -e "${GREEN}[SUCCESS] GCC compiler successfully installed:${NC}"
        echo -e "          $GCC_VERSION"
    else
        echo -e "${RED}[ERROR] FATAL: Failed to install GCC compiler on this machine.${NC}"
        echo -e "${RED}        Please manually install build-essential and re-run.${NC}"
        GCC_STATUS="CRITICAL_MISSING"
        GCC_VERSION="NOT_INSTALLED"
        APP_READY="FAILED"
    fi
fi

# ------------------------------------------------------------------------------
# 3. VERIFY NODE.JS RUNTIME (OPTIONAL DEBUGGING HOOK)
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[INFO] Step 3/5: Checking Node.js runtime status...${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_STATUS=$(node -v)
    echo -e "${GREEN}[SUCCESS] Node.js runtime detected: $NODE_STATUS${NC}"
else
    echo -e "${CYAN}[INFO] Node.js not detected in global PATH.${NC}"
    echo -e "       (Optional if running pre-packaged standalone Bug Busters executable)."
    NODE_STATUS="NOT_INSTALLED_OPTIONAL"
fi

# ------------------------------------------------------------------------------
# 4. WORKSPACE ISOLATION, ASSET TRANSFER & PERMISSION VECTOR
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[INFO] Step 4/5: Transferring application package to target tree...${NC}"
echo -e "          Destination: $TARGET_DIR"

mkdir -p "$TARGET_DIR"

if command -v rsync >/dev/null 2>&1; then
    rsync -aq --exclude="node_modules" --exclude="temp" --exclude=".git" \
              --exclude="sessions" --exclude="submissions" \
              --exclude="setup_env.bat" --exclude="setup_env.sh" \
              "$SCRIPT_DIR/" "$TARGET_DIR/"
else
    # Fallback to recursive copy
    cp -r "$SCRIPT_DIR/"* "$TARGET_DIR/" 2>/dev/null || true
fi

# Apply strict executable permissions vector across localized architecture
echo -e "${CYAN}[INFO] Applying strict execution permissions vector (chmod -R 755)...${NC}"
chmod -R 755 "$TARGET_DIR"
echo -e "${GREEN}[SUCCESS] Package localized and permissions applied.${NC}"

# Create run helper script
RUN_SCRIPT="$TARGET_DIR/run_bugbusters.sh"
cat << 'EOF' > "$RUN_SCRIPT"
#!/bin/bash
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR" || exit 1

if [ -f "./BugBusters" ] && [ -x "./BugBusters" ]; then
    ./BugBusters "$@"
elif command -v npm >/dev/null 2>&1; then
    npm start "$@"
elif command -v electron >/dev/null 2>&1; then
    electron . "$@"
else
    echo "Bug Busters launcher requires Node/Electron or standalone binary."
    read -p "Press [Enter] to exit..."
fi
EOF
chmod +x "$RUN_SCRIPT"

# ------------------------------------------------------------------------------
# 5. GENERATE DESKTOP LAUNCHER (.desktop SHORTCUT)
# ------------------------------------------------------------------------------
echo ""
echo -e "${CYAN}[INFO] Step 5/5: Generating graphical desktop launcher shortcut...${NC}"

DESKTOP_ENTRY="$DESKTOP_DIR/BugBusters.desktop"

cat << EOF > "$DESKTOP_ENTRY"
[Desktop Entry]
Version=1.0
Type=Application
Name=Bug Busters Contest Platform
Comment=Universal Offline Competitive Programming & Assessment Environment
Exec=/bin/bash "$RUN_SCRIPT"
Path=$TARGET_DIR
Icon=utilities-terminal
Terminal=false
Categories=Development;Education;IDE;
StartupNotify=true
EOF

chmod +x "$DESKTOP_ENTRY"

# Attempt to mark trusted for GNOME/Ubuntu desktop environments
if command -v gio >/dev/null 2>&1; then
    gio set "$DESKTOP_ENTRY" metadata::trusted true 2>/dev/null || true
fi

echo -e "${GREEN}[SUCCESS] Desktop launcher shortcut generated at:${NC}"
echo -e "          $DESKTOP_ENTRY"

# ------------------------------------------------------------------------------
# 6. CROSS-PLATFORM SYSTEM REPORTING (env_report.txt)
# ------------------------------------------------------------------------------
PC_NAME=$(hostname)
ARCH_TYPE=$(uname -m)
KERNEL_VER=$(uname -s -r)
REPORT_TIMESTAMP=$(date)

cat << EOF > "$REPORT_FILE"
===============================================================================
BUG BUSTERS LAB ENVIRONMENT HEALTH REPORT [LINUX]
Timestamp              : $REPORT_TIMESTAMP
===============================================================================
Student PC Name        : $PC_NAME
OS Architecture Type   : $ARCH_TYPE
Operating System       : $KERNEL_VER
Logged-in User Account : $USER
User Desktop Path      : $DESKTOP_DIR
Local Deployment Target: $TARGET_DIR
Source USB Device Path : $SCRIPT_DIR

--- COMPILER & RUNTIME DIAGNOSTICS ---
GCC Integration Status : $GCC_STATUS
Global GCC Version     : $GCC_VERSION
Node.js Engine Status  : $NODE_STATUS

--- OVERALL DEPLOYMENT STATUS ---
Environment Readiness  : $APP_READY
===============================================================================
EOF

echo ""
echo -e "${CYAN}===============================================================================${NC}"
if [ "$APP_READY" = "READY" ]; then
    echo -e "${GREEN}${BOLD}  [SUCCESS] ENVIRONMENT DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}  Readiness Flag: READY${NC}"
else
    echo -e "${RED}${BOLD}  [ERROR] ENVIRONMENT SETUP COMPLETED WITH WARNINGS/FAILURES!${NC}"
    echo -e "${RED}  Readiness Flag: FAILED${NC}"
fi
echo ""
echo -e "  Diagnostics report generated at:"
echo -e "  ${BOLD}$REPORT_FILE${NC}"
echo -e "${CYAN}===============================================================================${NC}"
echo ""
exit 0
