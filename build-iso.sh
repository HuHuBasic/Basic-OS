#!/bin/sh
# ================================================
#  basic OS - ISO Builder
#  Builds a bootable ISO from kernel + rootfs
# ================================================

set -e

KERNEL="/workspace/basic-os/vmlinuz-basic"
ROOTFS="/workspace/basic-os/rootfs"
ISO_OUT="/workspace/basic-os/basic-os.iso"
ISO_DIR="/tmp/basic-iso-$$"

echo "============================================"
echo "  basic OS ISO Builder"
echo "============================================"
echo ""

# ---- Check prerequisites ----
if [ ! -f "$KERNEL" ]; then
    echo "ERROR: Kernel not found at $KERNEL"
    exit 1
fi

if [ ! -d "$ROOTFS" ]; then
    echo "ERROR: RootFS not found at $ROOTFS"
    echo "Run ./build-rootfs.sh first."
    exit 1
fi

# ---- Build initramfs ----
echo "[1/3] Building initramfs..."
cd "$ROOTFS"
find . -print0 | cpio --null -o --format=newc 2>/dev/null | gzip -9 > /tmp/initramfs-basic.cpio.gz
INITRD_SIZE=$(du -h /tmp/initramfs-basic.cpio.gz | cut -f1)
echo "  Initramfs: $INITRD_SIZE"

# ---- Build ISO ----
echo "[2/3] Building ISO..."

rm -rf "$ISO_DIR"
mkdir -p "$ISO_DIR/boot/isolinux"

# Copy kernel
cp "$KERNEL" "$ISO_DIR/boot/vmlinuz-basic"

# Copy initramfs
cp /tmp/initramfs-basic.cpio.gz "$ISO_DIR/boot/initramfs.cpio.gz"

# Create isolinux config
cat > "$ISO_DIR/boot/isolinux/isolinux.cfg" << 'EOF'
DEFAULT menu
TIMEOUT 100
PROMPT 0
UI menu.c32

MENU TITLE basic OS Boot Menu
MENU COLOR screen 37;40
MENU COLOR border 30;44
MENU COLOR title 1;36;44
MENU COLOR sel 7;37;40
MENU COLOR unsel 37;40
MENU COLOR hotkey 1;37;44
MENU COLOR hotsel 1;7;37;40

LABEL desktop
    MENU LABEL ^1 Desktop (Live)
    MENU DEFAULT
    KERNEL /boot/vmlinuz-basic
    APPEND initrd=/boot/initramfs.cpio.gz console=tty0 quiet

LABEL text
    MENU LABEL ^2 Text Mode
    KERNEL /boot/vmlinuz-basic
    APPEND initrd=/boot/initramfs.cpio.gz console=tty0 text quiet

LABEL installer
    MENU LABEL ^3 Installer
    KERNEL /boot/vmlinuz-basic
    APPEND initrd=/boot/initramfs.cpio.gz console=tty0 installer quiet

LABEL rescue
    MENU LABEL ^4 Rescue Mode
    KERNEL /boot/vmlinuz-basic
    APPEND initrd=/boot/initramfs.cpio.gz console=tty0 rescue quiet
EOF

# Copy isolinux files
if [ -d /usr/lib/ISOLINUX ]; then
    cp /usr/lib/ISOLINUX/isolinux.bin "$ISO_DIR/boot/isolinux/"
    cp /usr/lib/syslinux/modules/bios/menu.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
    cp /usr/lib/syslinux/modules/bios/libutil.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
    cp /usr/lib/syslinux/modules/bios/libcom32.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
elif [ -f /usr/share/syslinux/isolinux.bin ]; then
    cp /usr/share/syslinux/isolinux.bin "$ISO_DIR/boot/isolinux/"
    cp /usr/lib/syslinux/modules/bios/menu.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
    cp /usr/lib/syslinux/modules/bios/libutil.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
    cp /usr/lib/syslinux/modules/bios/libcom32.c32 "$ISO_DIR/boot/isolinux/" 2>/dev/null || true
else
    echo "  WARNING: ISOLINUX not found. ISO may not be bootable."
fi

# Create ISO
if command -v xorriso >/dev/null 2>&1; then
    xorriso -as mkisofs \
        -o "$ISO_OUT" \
        -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin 2>/dev/null || true \
        -b boot/isolinux/isolinux.bin \
        -c boot/isolinux/boot.cat \
        -no-emul-boot \
        -boot-load-size 4 \
        -boot-info-table \
        -J -R -V "basicOS" \
        "$ISO_DIR" 2>/dev/null
elif command -v genisoimage >/dev/null 2>&1; then
    genisoimage -o "$ISO_OUT" \
        -b boot/isolinux/isolinux.bin \
        -c boot/isolinux/boot.cat \
        -no-emul-boot \
        -boot-load-size 4 \
        -boot-info-table \
        -J -R -V "basicOS" \
        "$ISO_DIR" 2>/dev/null
else
    echo "ERROR: Neither xorriso nor genisoimage found."
    echo "Install: apt-get install xorriso isolinux"
    exit 1
fi

# Make hybrid
if command -v isohybrid >/dev/null 2>&1; then
    isohybrid "$ISO_OUT" 2>/dev/null || true
fi

# ---- Cleanup ----
rm -rf "$ISO_DIR" /tmp/initramfs-basic.cpio.gz

echo "[3/3] Done!"
echo ""
echo "============================================"
echo "  ISO created successfully!"
echo "============================================"
echo ""
echo "  File: $ISO_OUT"
echo "  Size: $(du -h "$ISO_OUT" | cut -f1)"
echo ""
echo "Test with:"
echo "  qemu-system-x86_64 -cdrom $ISO_OUT -m 512M"