# basic OS

一个基于 Linux Kernel 7.1.6 的最小化图形操作系统，支持安装到硬盘、自带应用中心、framebuffer 桌面环境。

## 系统信息

| 组件 | 版本 |
|------|------|
| 内核 | Linux 7.1.6 (stable) |
| 来源 | https://www.kernel.org/ |
| 用户空间 | BusyBox 1.36.1 (静态编译) |
| 图形界面 | Framebuffer Desktop (直接写屏, 无 X11) |
| TUI 工具 | dialog (ncurses 静态编译) |
| 架构 | x86_64 |

## 启动模式

ISO 引导菜单提供 4 种模式：

| 模式 | 说明 |
|------|------|
| **Desktop (Live)** | 直接进入 framebuffer 图形桌面 |
| **Text Mode** | 文本终端模式 |
| **Installer** | 图形化安装程序 (dialog) |
| **Rescue Mode** | 救援模式 shell |

## 快速体验

```bash
# 从 ISO 启动（图形桌面）
qemu-system-x86_64 -cdrom basic-os.iso

# 文本模式
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 text quiet"

# 安装程序
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 installer quiet"
```

## Framebuffer 桌面

basic OS 内置了直接写屏的 framebuffer 桌面环境：

- 蓝色渐变背景
- 桌面图标：Terminal、App Center、Installer、Reboot、Shutdown
- 底部任务栏，显示系统名称和实时时钟
- 鼠标支持（点击图标打开窗口）
- 窗口支持标题栏和关闭按钮
- 无需 X11/Wayland，纯 C + framebuffer

## 应用中心

图形化应用中心（dialog TUI），支持：

```bash
basic-appcenter    # 打开图形化应用中心
```

功能：
- 浏览所有可用应用
- 在线安装/卸载应用
- 搜索应用
- 查看已安装应用
- 更新应用列表

## 安装到电脑

1. 将 `basic-os.iso` 写入 U 盘或刻录光盘
2. 引导时选择 **Installer** 模式
3. 图形化安装程序引导你选择磁盘、确认、自动安装

## 功能特性

- x86_64 架构，支持 SMP 多核
- Framebuffer 图形桌面（无需 X11）
- BusyBox 静态编译，无外部依赖
- 图形化安装程序和图形化应用中心
- 文件系统支持: ext4, vfat, exfat, iso9660, overlay, tmpfs
- 网络支持: IPv4/IPv6, TCP/UDP, iptables/nftables
- 设备支持: ATA/SCSI/virtio 块设备, USB, PCI
- 虚拟化: KVM Guest, virtio 驱动, UEFI 启动
- 容器: Cgroups, Namespaces, BPF, Seccomp

## 项目结构

```
basic-os/
├── README.md
├── basic-os.iso                  # 可启动 ISO 镜像 (14MB)
├── vmlinuz-basic                 # Linux 内核
├── initramfs.cpio.gz             # 根文件系统 (7.7MB)
├── kernel-config.txt             # 内核配置
├── src/
│   ├── init/init                 # 初始化脚本
│   ├── installer/basic-install   # 图形化安装程序 (dialog)
│   ├── appcenter/basic-appcenter # 图形化应用中心 (dialog)
│   └── desktop/basic-desktop.c   # Framebuffer 桌面 (C)
└── apps/
    ├── apps.list                 # 应用商店列表
    └── hello/                    # 示例应用包
```