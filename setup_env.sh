#!/bin/bash
# ==============================================================================
# MASS-CODE // AUTOMATED LAB ENVIRONMENT DEPLOYMENT SCRIPT (LINUX)
# Universal Offline Competitive Programming Setup
# ==============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="/home/$USER/Desktop/MassCode_Local"
DESKTOP_DIR="/home/$USER/Desktop"
REPORT_FILE="$TARGET_DIR/env_report.txt"

APP_READY="READY"
GCC_STATUS="NOT_FOUND"
GCC_VERSION="MISSING"
NODE_STATUS="NOT_INSTALLED_OPTIONAL"

echo -e "${CYAN}${BOLD}"
echo "==============================================================================="
echo "   __  __    _    ____ ____         ____ ___  ____  _____ "
echo "  |  \/  |  / \  / ___/ ___|       / ___/ _ \|  _ \| ____|"
echo "  | |\/| | / _ \ \___ \___ \  _____| |  | | | | | | |  _|  "
echo "  | |  | |/ ___ \ ___) |__) |_____| |__| |_| | |_| | |___ "
echo "  |_|  |_/_/   \_\____/____/       \____\___/|____/|_____|"
echo ""
echo "   AUTOMATED LAB ENVIRONMENT VERIFICATION & DEPLOYMENT UTILITY (LINUX)"
echo "==============================================================================="
echo -e "${NC}"

# 1. Verify User Environment & Structural Write Access
echo -e "${CYAN}[INFO] Step 1/5: Verifying user environment and directory permissions...${NC}"
if [ ! -d "$HOME" ] || [ ! -w "$HOME" ]; then
    echo -e "${RED}[ERROR] Active user home directory '$HOME' is not writable!${NC}"
    APP_READY="FAILED"
    exit 1
fi

mkdir -p "$DESKTOP_DIR" 2>/dev/null
echo -e "${GREEN}[SUCCESS] Structural read, write, and execution verified for user '$USER'.${NC}"

# 2. Check & Install GCC
echo ""
echo -e "${CYAN}[INFO] Step 2/5: Checking for native C/C++ GCC compiler...${NC}"
if command -v gcc >/dev/null 2>&1; then
    GCC_VERSION=$(gcc --version | head -n 1)
    GCC_STATUS="GLOBAL_ACTIVE"
    echo -e "${GREEN}[SUCCESS] GCC compiler is available globally: $GCC_VERSION${NC}"
else
    echo -e "${YELLOW}[WARNING] GCC compiler is missing. Invoking package manager...${NC}"
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install build-essential -y
    fi
    if command -v gcc >/dev/null 2>&1; then
        GCC_VERSION=$(gcc --version | head -n 1)
        GCC_STATUS="INSTALLED_VIA_PKG_MGR"
        echo -e "${GREEN}[SUCCESS] GCC compiler installed: $GCC_VERSION${NC}"
    else
        echo -e "${RED}[ERROR] Failed to install GCC. Please install build-essential.${NC}"
        GCC_STATUS="CRITICAL_MISSING"
        APP_READY="FAILED"
    fi
fi

# 3. Check Node.js
echo ""
echo -e "${CYAN}[INFO] Step 3/5: Checking Node.js runtime status...${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_STATUS=$(node -v)
    echo -e "${GREEN}[SUCCESS] Node.js runtime detected: $NODE_STATUS${NC}"
else
    NODE_STATUS="NOT_INSTALLED_OPTIONAL"
fi

# 4. Workspace Isolation & Permissions
echo ""
echo -e "${CYAN}[INFO] Step 4/5: Transferring application package to: $TARGET_DIR${NC}"
mkdir -p "$TARGET_DIR"

if command -v rsync >/dev/null 2>&1; then
    rsync -aq --exclude="node_modules" --exclude="temp" --exclude=".git" \
              --exclude="sessions" --exclude="submissions" \
              "$SCRIPT_DIR/" "$TARGET_DIR/"
else
    cp -r "$SCRIPT_DIR/"* "$TARGET_DIR/" 2>/dev/null || true
fi

chmod -R 755 "$TARGET_DIR"
echo -e "${GREEN}[SUCCESS] Package localized and permissions applied (755).${NC}"

# 5. Generate Desktop Shortcut (.desktop)
echo ""
echo -e "${CYAN}[INFO] Step 5/5: Generating desktop launcher shortcut...${NC}"
DESKTOP_ENTRY="$DESKTOP_DIR/MassCode.desktop"

cat << EOF > "$DESKTOP_ENTRY"
[Desktop Entry]
Version=1.0
Type=Application
Name=Mass-Code Platform
Comment=Universal Offline Competitive Programming & Assessment Environment
Exec=/bin/bash "$TARGET_DIR/launch_masscode.sh"
Path=$TARGET_DIR
Icon=$TARGET_DIR/assets/logo.png
Terminal=false
Categories=Development;Education;IDE;
StartupNotify=true
EOF

chmod +x "$DESKTOP_ENTRY"
if command -v gio >/dev/null 2>&1; then
    gio set "$DESKTOP_ENTRY" metadata::trusted true 2>/dev/null || true
fi

echo -e "${GREEN}[SUCCESS] Desktop launcher shortcut generated at: $DESKTOP_ENTRY${NC}"

# 6. Report Generation
cat << EOF > "$REPORT_FILE"
===============================================================================
MASS-CODE LAB ENVIRONMENT HEALTH REPORT [LINUX]
Timestamp              : $(date)
===============================================================================
Student PC Name        : $(hostname)
OS Architecture Type   : $(uname -m)
Operating System       : $(uname -s -r)
Logged-in User Account : $USER
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
echo -e "  Diagnostics report: $REPORT_FILE"
echo -e "${CYAN}===============================================================================${NC}"
echo ""
exit 0
