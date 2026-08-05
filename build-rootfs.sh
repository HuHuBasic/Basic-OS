#!/bin/sh
# ================================================
#  basic OS - RootFS Builder
#  Builds the root filesystem with all system tools
#  Usage: ./build-rootfs.sh [stable|beta]
#     stable = public release, no activation
#     beta   = internal testing, requires activation code
# ================================================

set -e

ROOTFS="/workspace/basic-os/rootfs"
SRC="/workspace/basic-os/src"
EDITION="${1:-stable}"

if [ "$EDITION" != "stable" ] && [ "$EDITION" != "beta" ]; then
    echo "Usage: ./build-rootfs.sh [stable|beta]"
    echo "  stable = public release (default)"
    echo "  beta   = internal testing, requires activation"
    exit 1
fi

echo "============================================"
echo "  basic OS RootFS Builder"
echo "  Edition: $EDITION"
echo "============================================"
echo ""

# Clean and recreate
rm -rf "$ROOTFS"
mkdir -p "$ROOTFS"/{bin,sbin,usr/bin,usr/sbin,usr/share/basic-apps/apps,etc/basic-os/locale,var/cache/basic-update/backup,var/log,tmp,proc,sys,dev/pts,run,mnt,root,boot,lib/modules}

# ---- Copy BusyBox binaries ----
echo "[1/9] Setting up BusyBox..."
# Use pre-built static busybox
if [ -f /bin/busybox ]; then
    cp /bin/busybox "$ROOTFS/bin/busybox"
elif [ -f /workspace/basic-os/busybox ]; then
    cp /workspace/basic-os/busybox "$ROOTFS/bin/busybox"
else
    # Try to find busybox
    BUSYBOX=$(which busybox 2>/dev/null || echo "")
    if [ -z "$BUSYBOX" ]; then
        echo "  WARNING: BusyBox not found. Install it first."
        echo "  apt-get install busybox-static (Debian/Ubuntu)"
        echo "  yum install busybox (RHEL/CentOS)"
        exit 1
    fi
    cp "$BUSYBOX" "$ROOTFS/bin/busybox"
fi

chmod +x "$ROOTFS/bin/busybox"

# Create symlinks for common applets
cd "$ROOTFS/bin"
for applet in sh ash ls cat cp mv rm mkdir rmdir mount umount grep sed awk \
    head tail cut wc sort uniq tr basename dirname echo printf sleep \
    chmod chown chgrp ln sync df du dd kill ps free top \
    tar gzip gunzip xz unxz bzip2 bunzip2 \
    wget ftpget tftp nc ping ping6 ifconfig route netstat \
    fdisk sfdisk mkfs.ext4 blkid mkswap swapon swapoff \
    reboot poweroff halt init sha256sum; do
    ln -sf busybox "$applet" 2>/dev/null || true
done

cd "$ROOTFS/sbin"
for applet in init reboot poweroff halt fdisk sfdisk mkfs.ext4 mkswap \
    swapon swapoff ifconfig route sysctl; do
    ln -sf ../bin/busybox "$applet" 2>/dev/null || true
done

# ---- Copy dialog (if available) ----
echo "[2/9] Setting up dialog..."
if [ -f /workspace/basic-os/dialog-static ]; then
    cp /workspace/basic-os/dialog-static "$ROOTFS/usr/bin/dialog"
elif [ -f /usr/bin/dialog ]; then
    cp /usr/bin/dialog "$ROOTFS/usr/bin/dialog"
    # Copy libraries if needed
    if ldd /usr/bin/dialog >/dev/null 2>&1; then
        for lib in $(ldd /usr/bin/dialog 2>/dev/null | grep -o '/[^ ]*'); do
            libdir=$(dirname "$lib")
            mkdir -p "$ROOTFS/$libdir"
            cp "$lib" "$ROOTFS/$lib" 2>/dev/null || true
        done
    fi
else
    echo "  WARNING: dialog not found. TUI interfaces will not work."
fi
chmod +x "$ROOTFS/usr/bin/dialog" 2>/dev/null || true

# ---- Copy terminfo ----
echo "[3/9] Copying terminfo..."
mkdir -p "$ROOTFS/usr/share/terminfo/l"
if [ -f /usr/share/terminfo/l/linux ]; then
    cp /usr/share/terminfo/l/linux "$ROOTFS/usr/share/terminfo/l/"
fi

# ---- Copy syslinux files ----
echo "[4/9] Copying syslinux..."
mkdir -p "$ROOTFS/usr/lib/syslinux/modules/bios"
if [ -d /usr/lib/syslinux/modules/bios ]; then
    cp /usr/lib/syslinux/modules/bios/{menu.c32,libutil.c32,libcom32.c32,mbr.bin} "$ROOTFS/usr/lib/syslinux/modules/bios/" 2>/dev/null || true
fi

# ---- Install i18n framework ----
echo "[5/9] Installing i18n framework..."
cp "$SRC/i18n/i18n.sh" "$ROOTFS/etc/basic-os/locale/"
cp "$SRC/i18n/en.sh" "$ROOTFS/etc/basic-os/locale/"
cp "$SRC/i18n/zh-CN.sh" "$ROOTFS/etc/basic-os/locale/"
cp "$SRC/i18n/zh-TW.sh" "$ROOTFS/etc/basic-os/locale/"

# Default locale config
echo "BASIC_LANG=en" > "$ROOTFS/etc/basic-os/locale.conf"

# ---- Install version file ----
echo "[6/9] Installing version file..."
if [ "$EDITION" = "beta" ]; then
    echo "1.0.0-beta" > "$ROOTFS/etc/basic-os/version"
else
    echo "1.0.0" > "$ROOTFS/etc/basic-os/version"
fi

# ---- Install edition flag ----
echo "$EDITION" > "$ROOTFS/etc/basic-os/edition"

# ---- Install system scripts ----
echo "[7/9] Installing system scripts..."

# Init script - depends on edition
if [ "$EDITION" = "beta" ]; then
    cp "$SRC/init/init-beta" "$ROOTFS/init"
    echo "  -> init-beta (activation required)"
else
    cp "$SRC/init/init-i18n" "$ROOTFS/init"
    echo "  -> init-i18n (stable)"
fi
chmod +x "$ROOTFS/init"

# Installer (i18n version)
cp "$SRC/installer/basic-install-i18n" "$ROOTFS/usr/sbin/basic-install"
chmod +x "$ROOTFS/usr/sbin/basic-install"

# App Center (i18n version)
cp "$SRC/appcenter/basic-appcenter-i18n" "$ROOTFS/usr/bin/basic-appcenter"
chmod +x "$ROOTFS/usr/bin/basic-appcenter"

# Update system
cp "$SRC/update/basic-update" "$ROOTFS/usr/sbin/basic-update"
chmod +x "$ROOTFS/usr/sbin/basic-update"

# Desktop (if compiled)
if [ -f "$SRC/desktop/basic-desktop" ]; then
    cp "$SRC/desktop/basic-desktop" "$ROOTFS/usr/bin/basic-desktop"
    chmod +x "$ROOTFS/usr/bin/basic-desktop"
else
    echo "  NOTE: basic-desktop not compiled. Run 'gcc -static -o src/desktop/basic-desktop src/desktop/basic-desktop.c -lm' first."
fi

# ---- Install activation system (always included, only enforced in beta) ----
echo "[8/9] Installing activation system..."
cp "$SRC/activation/activate" "$ROOTFS/usr/sbin/activate"
chmod +x "$ROOTFS/usr/sbin/activate"

# Copy activation code database (SHA256 hashes)
if [ -f /workspace/basic-os/keys/codes.db ]; then
    cp /workspace/basic-os/keys/codes.db "$ROOTFS/etc/basic-os/codes.db"
    echo "  -> codes.db installed ($(wc -l < /workspace/basic-os/keys/codes.db | tr -d ' ') hashes)"
else
    echo "  WARNING: codes.db not found. Run src/activation/generate-codes.py first."
fi

# ---- Copy app list ----
echo "[9/9] Installing app list..."
cp /workspace/basic-os/apps/apps.list "$ROOTFS/usr/share/basic-apps/apps.list"

echo ""
echo "============================================"
echo "  RootFS build complete!"
echo "============================================"
echo ""
echo "  Edition: $EDITION"
echo "  RootFS:  $ROOTFS"
echo "  Size:    $(du -sh "$ROOTFS" | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Build ISO: cd /workspace/basic-os && ./build-iso.sh"
echo "  2. Build update package: cd /workspace/basic-os && ./src/update/build-update 1.0.1"