#!/bin/sh
# ================================================
#  basic OS - i18n Framework
#  Loads the appropriate language file based on
#  LANG environment variable or saved config.
# ================================================

I18N_DIR="/etc/basic-os/locale"
I18N_CONFIG="/etc/basic-os/locale.conf"

# ---- Detect language ----
detect_lang() {
    # Priority: 1. LANG env var, 2. saved config, 3. default (en)
    if [ -n "$LANG" ]; then
        case "$LANG" in
            zh_CN*|zh-CN*|zh_CN.UTF-8*|zh-CN.UTF-8*) echo "zh-CN" ; return ;;
            zh_TW*|zh-TW*|zh_TW.UTF-8*|zh-TW.UTF-8*) echo "zh-TW" ; return ;;
            zh_HK*|zh-HK*) echo "zh-TW" ; return ;;
            en*) echo "en" ; return ;;
            *) echo "en" ; return ;;
        esac
    fi

    if [ -f "$I18N_CONFIG" ]; then
        . "$I18N_CONFIG"
        echo "${BASIC_LANG:-en}"
        return
    fi

    echo "en"
}

# ---- Set language ----
set_lang() {
    local lang="$1"
    mkdir -p "$(dirname "$I18N_CONFIG")"
    echo "BASIC_LANG=$lang" > "$I18N_CONFIG"
    echo "$lang"
}

# ---- Load language file ----
load_lang() {
    local lang="${1:-$(detect_lang)}"
    local lang_file="$I18N_DIR/$lang.sh"

    if [ -f "$lang_file" ]; then
        . "$lang_file"
    else
        # Fallback to English
        if [ -f "$I18N_DIR/en.sh" ]; then
            . "$I18N_DIR/en.sh"
        fi
    fi
}

# ---- Get translated string by key ----
# Usage: t KEY [args...]
# Uses printf-style format if args provided
t() {
    local key="$1"
    shift
    local val
    eval "val=\${$key:-$key}"
    if [ $# -gt 0 ]; then
        printf "$val" "$@"
    else
        echo "$val"
    fi
}

# ---- List available languages ----
list_langs() {
    echo "Available languages:"
    for f in "$I18N_DIR"/*.sh; do
        [ -f "$f" ] || continue
        local lang=$(basename "$f" .sh)
        local mark=""
        [ "$lang" = "$(detect_lang)" ] && mark=" *"
        echo "  $lang$mark"
    done
}

# ---- Auto-load if sourced ----
if [ "${0##*/}" != "i18n.sh" ]; then
    load_lang
fi