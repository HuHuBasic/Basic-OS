# basic OS

一个基于 Linux Kernel 7.1.6 的最小化操作系统，支持安装到硬盘、自带应用中心。

## 系统信息

| 组件 | 版本 |
|------|------|
| 内核 | Linux 7.1.6 (stable) |
| 来源 | https://www.kernel.org/ |
| 用户空间 | BusyBox 1.36.1 (静态编译) |
| 架构 | x86_64 |

## 文件说明

- `basic-os.iso` - 可启动 ISO 镜像 (13MB, ISOLINUX 引导)
- `vmlinuz-basic` - 编译好的 Linux 内核 (bzImage, 5.4MB)
- `initramfs.cpio.gz` - 根文件系统镜像 (包含安装程序和应用中心)
- `kernel-config.txt` - 内核配置参数

## 快速体验

```bash
# 从 ISO 启动
qemu-system-x86_64 -cdrom basic-os.iso

# 或直接启动内核
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 quiet"
```

## 安装到电脑

1. 将 `basic-os.iso` 写入 U 盘或刻录到光盘
2. 从 U 盘/光盘启动
3. 在引导菜单中选择 **basic OS Installer**
4. 按提示选择目标磁盘并确认安装

安装程序会自动分区、格式化、拷贝系统文件并安装引导器。安装完成后可直接从硬盘启动。

## 应用中心

basic OS 内置了应用中心（App Center），可通过 `basic-appcenter` 命令管理应用：

```bash
basic-appcenter list          # 查看所有可用应用
basic-appcenter install nano  # 安装应用
basic-appcenter remove nano   # 卸载应用
basic-appcenter search ssh    # 搜索应用
basic-appcenter installed     # 查看已安装应用
```

## 功能特性

- x86_64 架构，支持 SMP 多核
- BusyBox 静态编译，无外部依赖 (sh, ls, cat, mount 等)
- 支持 Live 模式、安装模式、救援模式
- 内置应用中心，支持在线安装/卸载应用
- 文件系统支持: ext4, vfat, exfat, iso9660, overlay, tmpfs
- 网络支持: IPv4/IPv6, TCP/UDP, iptables/nftables
- 设备支持: ATA/SCSI/virtio 块设备, USB, PCI
- 虚拟化: KVM Guest, virtio 驱动, UEFI 启动
- 容器: Cgroups, Namespaces, BPF, Seccomp

## 项目结构

```
basic-os/
├── README.md
├── basic-os.iso              # 可启动 ISO 镜像
├── vmlinuz-basic             # Linux 内核
├── initramfs.cpio.gz         # 根文件系统
├── kernel-config.txt         # 内核配置
├── src/
│   ├── init/init             # 系统初始化脚本
│   ├── installer/basic-install     # 安装程序
│   └── appcenter/basic-appcenter   # 应用中心
└── apps/
    ├── apps.list             # 应用商店列表
    └── hello/                # 示例应用包
```