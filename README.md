# basic OS

A minimal, fast, and beautiful Linux operating system based on Linux Kernel 7.1.6. Features framebuffer desktop, graphical installer, app center, i18n support, and delta update system.

一个基于 Linux Kernel 7.1.6 的最小化图形操作系统，支持 framebuffer 桌面、图形化安装程序、应用中心、多语言和增量更新系统。

## System Info / 系统信息

| Component | Version |
|-----------|---------|
| Kernel / 内核 | Linux 7.1.6 (stable) |
| Source / 来源 | https://www.kernel.org/ |
| User Space / 用户空间 | BusyBox 1.36.1 (static) |
| Desktop / 桌面 | Framebuffer (no X11/Wayland) |
| TUI Toolkit | dialog |
| Architecture / 架构 | x86_64 |
| ISO Size / 大小 | ~14 MB |
| Languages / 语言 | EN, 简体中文, 繁體中文 |

## Boot Modes / 启动模式

ISO boot menu provides 4 modes:

| Mode | Description |
|------|-------------|
| **Desktop (Live)** | Framebuffer graphical desktop |
| **Text Mode** | Text terminal |
| **Installer** | Graphical installer (dialog) |
| **Rescue Mode** | Rescue shell |

## Quick Start / 快速体验

```bash
# Boot from ISO (graphical desktop)
qemu-system-x86_64 -cdrom basic-os.iso -m 512M

# Text mode
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 text quiet"

# Installer
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 installer quiet"
```

## Features / 功能特性

### Framebuffer Desktop / 桌面环境
- Pure C framebuffer desktop — no X11, no Wayland
- Blue gradient background with taskbar
- Desktop icons: Terminal, App Center, Installer, Reboot, Shutdown
- Mouse support with clickable windows
- Real-time clock display

### App Center / 应用中心
```bash
basic-appcenter    # Open graphical app center
```
- Browse all available apps
- One-click install / remove
- Search apps
- View installed apps
- Update app list online

### Update System / 更新系统
```bash
basic-update           # Full update flow
basic-update check     # Check for updates
basic-update update    # Download and install
basic-update rollback  # Rollback to previous version
basic-update version   # Show current version
basic-update clean     # Clean cache
```
- Delta update packages (.bup)
- Automatic backup before update
- Checksum verification
- One-click rollback

### Multi-Language / 多语言
```bash
# Set language
set-lang en     # English
set-lang zh-CN  # 简体中文
set-lang zh-TW  # 繁體中文
```
- All system tools localized
- Init, installer, app center, update system
- Language persists across reboots

## Installation / 安装

1. Write `basic-os.iso` to USB or burn to CD
2. Boot and select **Installer** mode
3. Follow the graphical installer

## Building from Source / 从源码构建

```bash
# Build root filesystem
./build-rootfs.sh

# Build ISO
./build-iso.sh

# Build update package
./src/update/build-update 1.0.1
```

## Project Structure / 项目结构

```
basic-os/
├── README.md
├── basic-os.iso                  # Bootable ISO (~14MB)
├── vmlinuz-basic                 # Linux kernel
├── initramfs.cpio.gz             # Root filesystem
├── kernel-config.txt             # Kernel config
├── build-rootfs.sh               # RootFS builder
├── build-iso.sh                  # ISO builder
├── website/
│   └── index.html                # Official website (EN/zh-CN/zh-TW)
├── updates/
│   └── latest.txt                # Update server manifest
├── src/
│   ├── init/
│   │   ├── init                  # Original init script
│   │   └── init-i18n             # i18n init script
│   ├── installer/
│   │   ├── basic-install         # Original installer
│   │   └── basic-install-i18n    # i18n installer
│   ├── appcenter/
│   │   ├── basic-appcenter       # Original app center
│   │   └── basic-appcenter-i18n  # i18n app center
│   ├── desktop/
│   │   ├── basic-desktop.c       # Framebuffer desktop (C)
│   │   └── basic-desktop         # Compiled binary
│   ├── update/
│   │   ├── basic-update          # Update client
│   │   └── build-update          # Update package builder
│   ├── i18n/
│   │   ├── i18n.sh               # i18n framework
│   │   ├── en.sh                 # English strings
│   │   ├── zh-CN.sh              # Simplified Chinese
│   │   └── zh-TW.sh              # Traditional Chinese
│   └── config/
│       └── version               # Current version
└── apps/
    ├── apps.list                 # App repository
    └── hello/                    # Example app package
```

## Links / 链接

- GitHub: https://github.com/HuHuBasic/Basic-OS
- Gitee: https://gitee.com/basic-game/basic-os
- Website: https://HuHuBasic.github.io/Basic-OS