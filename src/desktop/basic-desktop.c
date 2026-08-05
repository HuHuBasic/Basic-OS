/* ================================================
 *  basic OS - Framebuffer Desktop Environment
 *  Draws directly to /dev/fb0 (no X11 needed)
 *  Linux Kernel 7.1.6
 * ================================================ */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/ioctl.h>
#include <linux/fb.h>
#include <linux/input.h>
#include <time.h>
#include <signal.h>
#include <sys/wait.h>

/* ---- Types ---- */
typedef unsigned int u32;

typedef struct {
    int fd;
    struct fb_var_screeninfo vinfo;
    struct fb_fix_screeninfo finfo;
    u32 *fb;
    int w, h, bpp;
    int fb_size;
    u32 bg_color, bar_color, accent_color, text_color, white;
} Desktop;

typedef struct {
    int x, y, w, h;
    char label[32];
    u32 color;
    int action; /* 0=terminal, 1=appcenter, 2=installer, 3=reboot, 4=shutdown */
} Icon;

typedef struct {
    int x, y, w, h;
    char title[64];
    int visible;
    char text[4096];
    int text_lines;
} Window;

/* ---- Globals ---- */
Desktop g;
Icon icons[5];
Window win;
int mouse_x = 100, mouse_y = 100;
int mouse_btn = 0;
int running = 1;

/* ---- Pixel helpers ---- */
static inline void put_pixel(int x, int y, u32 color) {
    if (x >= 0 && x < g.w && y >= 0 && y < g.h)
        g.fb[y * g.w + x] = color;
}

#define RGB(r,g,b) (((u32)(b)<<16)|((u32)(g)<<8)|(r))

void fill_rect(int x, int y, int w, int h, u32 color) {
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > g.w) w = g.w - x;
    if (y + h > g.h) h = g.h - y;
    if (w <= 0 || h <= 0) return;
    for (int i = 0; i < h; i++) {
        u32 *row = &g.fb[(y + i) * g.w + x];
        for (int j = 0; j < w; j++) row[j] = color;
    }
}

void draw_rect(int x, int y, int w, int h, u32 color, int thickness) {
    for (int t = 0; t < thickness; t++) {
        for (int i = 0; i < w; i++) {
            put_pixel(x + i, y + t, color);
            put_pixel(x + i, y + h - 1 - t, color);
        }
        for (int i = 0; i < h; i++) {
            put_pixel(x + t, y + i, color);
            put_pixel(x + w - 1 - t, y + i, color);
        }
    }
}

/* ---- Simple bitmap font (8x16) ---- */
void draw_char(int x, int y, char c, u32 color) {
    /* Simple 8x8 font - only basic ASCII */
    static const unsigned char font[95][8] = {
        {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00}, /* space */
        {0x18,0x3c,0x3c,0x18,0x18,0x00,0x18,0x00}, /* ! */
        {0x66,0x66,0x24,0x00,0x00,0x00,0x00,0x00}, /* " */
        {0x6c,0x6c,0xfe,0x6c,0xfe,0x6c,0x6c,0x00}, /* # */
        {0x18,0x3e,0x60,0x3c,0x06,0x7c,0x18,0x00}, /* $ */
        {0x00,0xc6,0xcc,0x18,0x30,0x66,0xc6,0x00}, /* % */
        {0x38,0x6c,0x38,0x76,0xdc,0xcc,0x76,0x00}, /* & */
        {0x18,0x18,0x30,0x00,0x00,0x00,0x00,0x00}, /* ' */
        {0x0c,0x18,0x30,0x30,0x30,0x18,0x0c,0x00}, /* ( */
        {0x30,0x18,0x0c,0x0c,0x0c,0x18,0x30,0x00}, /* ) */
        {0x00,0x66,0x3c,0xff,0x3c,0x66,0x00,0x00}, /* * */
        {0x00,0x18,0x18,0x7e,0x18,0x18,0x00,0x00}, /* + */
        {0x00,0x00,0x00,0x00,0x18,0x18,0x30,0x00}, /* , */
        {0x00,0x00,0x00,0x7e,0x00,0x00,0x00,0x00}, /* - */
        {0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x00}, /* . */
        {0x06,0x0c,0x18,0x30,0x60,0xc0,0x80,0x00}, /* / */
        {0x3c,0x66,0x6e,0x76,0x66,0x66,0x3c,0x00}, /* 0 */
        {0x18,0x38,0x18,0x18,0x18,0x18,0x7e,0x00}, /* 1 */
        {0x3c,0x66,0x06,0x1c,0x30,0x66,0x7e,0x00}, /* 2 */
        {0x3c,0x66,0x06,0x1c,0x06,0x66,0x3c,0x00}, /* 3 */
        {0x1c,0x3c,0x6c,0xcc,0xfe,0x0c,0x0c,0x00}, /* 4 */
        {0x7e,0x60,0x7c,0x06,0x06,0x66,0x3c,0x00}, /* 5 */
        {0x3c,0x66,0x60,0x7c,0x66,0x66,0x3c,0x00}, /* 6 */
        {0x7e,0x66,0x0c,0x18,0x30,0x30,0x30,0x00}, /* 7 */
        {0x3c,0x66,0x66,0x3c,0x66,0x66,0x3c,0x00}, /* 8 */
        {0x3c,0x66,0x66,0x3e,0x06,0x66,0x3c,0x00}, /* 9 */
        {0x00,0x18,0x18,0x00,0x18,0x18,0x00,0x00}, /* : */
        {0x00,0x18,0x18,0x00,0x18,0x18,0x30,0x00}, /* ; */
        {0x0c,0x18,0x30,0x60,0x30,0x18,0x0c,0x00}, /* < */
        {0x00,0x00,0x7e,0x00,0x7e,0x00,0x00,0x00}, /* = */
        {0x30,0x18,0x0c,0x06,0x0c,0x18,0x30,0x00}, /* > */
        {0x3c,0x66,0x06,0x1c,0x18,0x00,0x18,0x00}, /* ? */
        {0x3c,0x66,0x6e,0x6e,0x60,0x62,0x3c,0x00}, /* @ */
        {0x18,0x3c,0x66,0x66,0x7e,0x66,0x66,0x00}, /* A */
        {0x7c,0x66,0x66,0x7c,0x66,0x66,0x7c,0x00}, /* B */
        {0x3c,0x66,0x60,0x60,0x60,0x66,0x3c,0x00}, /* C */
        {0x78,0x6c,0x66,0x66,0x66,0x6c,0x78,0x00}, /* D */
        {0x7e,0x60,0x60,0x78,0x60,0x60,0x7e,0x00}, /* E */
        {0x7e,0x60,0x60,0x78,0x60,0x60,0x60,0x00}, /* F */
        {0x3c,0x66,0x60,0x6e,0x66,0x66,0x3c,0x00}, /* G */
        {0x66,0x66,0x66,0x7e,0x66,0x66,0x66,0x00}, /* H */
        {0x3c,0x18,0x18,0x18,0x18,0x18,0x3c,0x00}, /* I */
        {0x1e,0x0c,0x0c,0x0c,0x0c,0x6c,0x38,0x00}, /* J */
        {0x66,0x6c,0x78,0x70,0x78,0x6c,0x66,0x00}, /* K */
        {0x60,0x60,0x60,0x60,0x60,0x60,0x7e,0x00}, /* L */
        {0xc6,0xee,0xfe,0xd6,0xc6,0xc6,0xc6,0x00}, /* M */
        {0x66,0x76,0x7e,0x7e,0x6e,0x66,0x66,0x00}, /* N */
        {0x3c,0x66,0x66,0x66,0x66,0x66,0x3c,0x00}, /* O */
        {0x7c,0x66,0x66,0x7c,0x60,0x60,0x60,0x00}, /* P */
        {0x3c,0x66,0x66,0x66,0x66,0x3c,0x0e,0x00}, /* Q */
        {0x7c,0x66,0x66,0x7c,0x78,0x6c,0x66,0x00}, /* R */
        {0x3c,0x66,0x60,0x3c,0x06,0x66,0x3c,0x00}, /* S */
        {0x7e,0x18,0x18,0x18,0x18,0x18,0x18,0x00}, /* T */
        {0x66,0x66,0x66,0x66,0x66,0x66,0x3c,0x00}, /* U */
        {0x66,0x66,0x66,0x66,0x66,0x3c,0x18,0x00}, /* V */
        {0xc6,0xc6,0xc6,0xd6,0xfe,0xee,0xc6,0x00}, /* W */
        {0x66,0x66,0x3c,0x18,0x3c,0x66,0x66,0x00}, /* X */
        {0x66,0x66,0x66,0x3c,0x18,0x18,0x18,0x00}, /* Y */
        {0x7e,0x06,0x0c,0x18,0x30,0x60,0x7e,0x00}, /* Z */
        {0x3c,0x30,0x30,0x30,0x30,0x30,0x3c,0x00}, /* [ */
        {0xc0,0x60,0x30,0x18,0x0c,0x06,0x02,0x00}, /* \ */
        {0x3c,0x0c,0x0c,0x0c,0x0c,0x0c,0x3c,0x00}, /* ] */
        {0x10,0x38,0x6c,0xc6,0x00,0x00,0x00,0x00}, /* ^ */
        {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff}, /* _ */
        {0x30,0x18,0x0c,0x00,0x00,0x00,0x00,0x00}, /* ` */
        {0x00,0x00,0x38,0x0c,0x3c,0x4c,0x36,0x00}, /* a */
        {0x60,0x60,0x7c,0x66,0x66,0x66,0x7c,0x00}, /* b */
        {0x00,0x00,0x3c,0x60,0x60,0x60,0x3c,0x00}, /* c */
        {0x06,0x06,0x3e,0x66,0x66,0x66,0x3e,0x00}, /* d */
        {0x00,0x00,0x3c,0x66,0x7e,0x60,0x3c,0x00}, /* e */
        {0x1c,0x30,0x7c,0x30,0x30,0x30,0x30,0x00}, /* f */
        {0x00,0x00,0x3e,0x66,0x66,0x3e,0x06,0x3c}, /* g */
        {0x60,0x60,0x7c,0x66,0x66,0x66,0x66,0x00}, /* h */
        {0x18,0x00,0x38,0x18,0x18,0x18,0x3c,0x00}, /* i */
        {0x0c,0x00,0x1c,0x0c,0x0c,0x6c,0x38,0x00}, /* j */
        {0x60,0x60,0x66,0x6c,0x78,0x6c,0x66,0x00}, /* k */
        {0x38,0x18,0x18,0x18,0x18,0x18,0x3c,0x00}, /* l */
        {0x00,0x00,0xec,0xfe,0xd6,0xc6,0xc6,0x00}, /* m */
        {0x00,0x00,0x7c,0x66,0x66,0x66,0x66,0x00}, /* n */
        {0x00,0x00,0x3c,0x66,0x66,0x66,0x3c,0x00}, /* o */
        {0x00,0x00,0x7c,0x66,0x66,0x7c,0x60,0x60}, /* p */
        {0x00,0x00,0x3e,0x66,0x66,0x3e,0x06,0x06}, /* q */
        {0x00,0x00,0x7c,0x66,0x60,0x60,0x60,0x00}, /* r */
        {0x00,0x00,0x3c,0x60,0x3c,0x06,0x7c,0x00}, /* s */
        {0x30,0x30,0x7c,0x30,0x30,0x30,0x1c,0x00}, /* t */
        {0x00,0x00,0x66,0x66,0x66,0x66,0x3e,0x00}, /* u */
        {0x00,0x00,0x66,0x66,0x66,0x3c,0x18,0x00}, /* v */
        {0x00,0x00,0xc6,0xd6,0xfe,0x6c,0x6c,0x00}, /* w */
        {0x00,0x00,0x66,0x3c,0x18,0x3c,0x66,0x00}, /* x */
        {0x00,0x00,0x66,0x66,0x66,0x3e,0x06,0x3c}, /* y */
        {0x00,0x00,0x7e,0x0c,0x18,0x30,0x7e,0x00}, /* z */
        {0x0e,0x18,0x18,0x70,0x18,0x18,0x0e,0x00}, /* { */
        {0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x00}, /* | */
        {0x70,0x18,0x18,0x0e,0x18,0x18,0x70,0x00}, /* } */
        {0x76,0xdc,0x00,0x00,0x00,0x00,0x00,0x00}, /* ~ */
    };

    if (c < 32 || c > 126) return;
    const unsigned char *bmp = font[c - 32];
    for (int row = 0; row < 8; row++) {
        for (int col = 0; col < 8; col++) {
            if (bmp[row] & (1 << (7 - col)))
                put_pixel(x + col, y + row, color);
        }
    }
}

void draw_text(int x, int y, const char *text, u32 color) {
    int cx = x;
    for (const char *p = text; *p; p++) {
        if (*p == '\n') { cx = x; y += 10; continue; }
        draw_char(cx, y, *p, color);
        cx += 8;
    }
}

void draw_text_centered(int y, const char *text, u32 color) {
    int len = strlen(text) * 8;
    draw_text((g.w - len) / 2, y, text, color);
}

/* ---- Desktop drawing ---- */
void draw_desktop() {
    /* Gradient background */
    for (int y = 0; y < g.h; y++) {
        int r = 10 + (y * 30 / g.h);
        int gr = 30 + (y * 60 / g.h);
        int b = 80 + (y * 80 / g.h);
        u32 c = RGB(r, gr, b);
        for (int x = 0; x < g.w; x++)
            g.fb[y * g.w + x] = c;
    }

    /* Taskbar */
    int bar_h = 44;
    fill_rect(0, g.h - bar_h, g.w, bar_h, g.bar_color);
    draw_rect(0, g.h - bar_h, g.w, bar_h, g.accent_color, 2);

    /* basic OS logo in taskbar */
    draw_text(12, g.h - bar_h + 8, "basic OS", g.white);
    draw_text(12, g.h - bar_h + 22, "Linux 7.1.6", RGB(160, 180, 200));

    /* Clock */
    time_t t = time(NULL);
    struct tm *tm = localtime(&t);
    char timebuf[64];
    strftime(timebuf, sizeof(timebuf), "%H:%M:%S", tm);
    draw_text(g.w - 70, g.h - bar_h + 8, timebuf, g.white);

    char datebuf[64];
    strftime(datebuf, sizeof(datebuf), "%Y-%m-%d", tm);
    draw_text(g.w - 80, g.h - bar_h + 22, datebuf, RGB(160, 180, 200));

    /* Desktop icons */
    for (int i = 0; i < 5; i++) {
        Icon *ic = &icons[i];
        /* Icon background */
        fill_rect(ic->x, ic->y, ic->w, ic->h, ic->color);
        draw_rect(ic->x, ic->y, ic->w, ic->h, g.white, 1);
        /* Icon label */
        int label_w = strlen(ic->label) * 8;
        draw_text(ic->x + (ic->w - label_w) / 2, ic->y + ic->h + 4, ic->label, g.white);
    }

    /* Window if visible */
    if (win.visible) {
        /* Window shadow */
        fill_rect(win.x + 4, win.y + 4, win.w, win.h, RGB(0, 0, 0));
        /* Window body */
        fill_rect(win.x, win.y, win.w, win.h, RGB(40, 44, 52));
        draw_rect(win.x, win.y, win.w, win.h, g.accent_color, 2);
        /* Title bar */
        fill_rect(win.x + 2, win.y + 2, win.w - 4, 24, g.accent_color);
        draw_text(win.x + 8, win.y + 6, win.title, g.white);

        /* Close button */
        fill_rect(win.x + win.w - 24, win.y + 4, 18, 18, RGB(200, 50, 50));
        draw_text(win.x + win.w - 21, win.y + 6, "X", g.white);

        /* Window content */
        draw_text(win.x + 8, win.y + 32, win.text, RGB(200, 200, 210));
    }

    /* Mouse cursor */
    draw_rect(mouse_x - 2, mouse_y - 2, 12, 12, g.white, 1);
    put_pixel(mouse_x + 5, mouse_y + 5, g.white);
}

/* ---- Icon click handling ---- */
int hit_test(int mx, int my, int x, int y, int w, int h) {
    return mx >= x && mx < x + w && my >= y && my < y + h;
}

void handle_icon_click(Icon *ic) {
    win.visible = 1;
    win.x = 100;
    win.y = 60;
    win.w = 500;
    win.h = 300;

    switch (ic->action) {
        case 0: /* Terminal */
            strcpy(win.title, "Terminal");
            strcpy(win.text, "basic OS Terminal\n\n"
                "Type commands below:\n"
                "  basic-appcenter  - Open App Center\n"
                "  basic-install    - Install to disk\n"
                "  ls /bin          - List commands\n"
                "  help             - Show help\n\n"
                "Press Ctrl+C to quit.");
            break;
        case 1: /* App Center */
            strcpy(win.title, "App Center");
            strcpy(win.text, "basic OS App Center\n\n"
                "Welcome! Browse and install apps.\n\n"
                "Available apps:\n"
                "  hello, nano, htop, dropbear\n"
                "  lynx, python-mini, busybox-extras\n\n"
                "Run 'basic-appcenter' to open.");
            break;
        case 2: /* Installer */
            strcpy(win.title, "Installer");
            strcpy(win.text, "basic OS Installer\n\n"
                "Install basic OS to your hard disk.\n\n"
                "WARNING: This will erase all data!\n\n"
                "Run 'basic-install' to start.");
            break;
        case 3: /* Reboot */
            running = 0;
            system("reboot -f");
            break;
        case 4: /* Shutdown */
            running = 0;
            system("poweroff -f");
            break;
    }
}

/* ---- Signal handler ---- */
void sig_handler(int sig) {
    running = 0;
    (void)sig;
}

/* ---- Main ---- */
int main(int argc, char *argv[]) {
    (void)argc; (void)argv;

    /* Colors */
    g.bg_color   = RGB(20, 40, 90);
    g.bar_color  = RGB(25, 30, 40);
    g.accent_color = RGB(52, 140, 220);
    g.text_color = RGB(200, 210, 220);
    g.white      = RGB(255, 255, 255);

    /* Open framebuffer */
    g.fd = open("/dev/fb0", O_RDWR);
    if (g.fd < 0) {
        fprintf(stderr, "Cannot open /dev/fb0\n");
        return 1;
    }

    ioctl(g.fd, FBIOGET_VSCREENINFO, &g.vinfo);
    ioctl(g.fd, FBIOGET_FSCREENINFO, &g.finfo);

    g.w = g.vinfo.xres;
    g.h = g.vinfo.yres;
    g.bpp = g.vinfo.bits_per_pixel;
    g.fb_size = g.finfo.smem_len;

    g.fb = (u32*)mmap(0, g.fb_size, PROT_READ | PROT_WRITE,
                       MAP_SHARED, g.fd, 0);
    if (g.fb == MAP_FAILED) {
        fprintf(stderr, "mmap failed\n");
        close(g.fd);
        return 1;
    }

    printf("Framebuffer: %dx%d, %d bpp, %d bytes\n", g.w, g.h, g.bpp, g.fb_size);

    /* Setup icons */
    int icon_w = 80, icon_h = 64;
    int start_x = 40, start_y = 60, gap = 20;

    Icon tmpl[] = {
        {start_x, start_y, icon_w, icon_h, "Terminal",   RGB(30, 30, 30), 0},
        {start_x + icon_w + gap, start_y, icon_w, icon_h, "App Center", RGB(20, 60, 120), 1},
        {start_x + 2*(icon_w + gap), start_y, icon_w, icon_h, "Installer", RGB(80, 50, 20), 2},
        {start_x + 3*(icon_w + gap), start_y, icon_w, icon_h, "Reboot",    RGB(120, 30, 30), 3},
        {start_x + 4*(icon_w + gap), start_y, icon_w, icon_h, "Shutdown",  RGB(60, 20, 20), 4},
    };
    memcpy(icons, tmpl, sizeof(tmpl));

    win.visible = 0;

    signal(SIGINT, sig_handler);
    signal(SIGTERM, sig_handler);

    /* Open mouse input */
    int mfd = open("/dev/input/mice", O_RDONLY | O_NONBLOCK);
    if (mfd < 0) mfd = open("/dev/input/mouse0", O_RDONLY | O_NONBLOCK);
    if (mfd < 0) mfd = open("/dev/input/event2", O_RDONLY | O_NONBLOCK);

    /* Main loop */
    struct timespec ts;
    ts.tv_sec = 0;
    ts.tv_nsec = 50000000; /* 50ms - 20fps */

    while (running) {
        draw_desktop();

        /* Read mouse */
        if (mfd >= 0) {
            signed char data[4];
            int n = read(mfd, data, 4);
            if (n == 4) {
                mouse_btn = data[0] & 0x07;
                int dx = data[1];
                int dy = -data[2];
                mouse_x += dx;
                mouse_y += dy;
                if (mouse_x < 0) mouse_x = 0;
                if (mouse_x >= g.w) mouse_x = g.w - 1;
                if (mouse_y < 0) mouse_y = 0;
                if (mouse_y >= g.h) mouse_y = g.h - 1;

                /* Handle click */
                if (mouse_btn & 1) {
                    /* Close window button */
                    if (win.visible && hit_test(mouse_x, mouse_y,
                        win.x + win.w - 24, win.y + 4, 18, 18)) {
                        win.visible = 0;
                    }
                    /* Desktop icons */
                    for (int i = 0; i < 5; i++) {
                        if (hit_test(mouse_x, mouse_y, icons[i].x, icons[i].y,
                                     icons[i].w, icons[i].h)) {
                            handle_icon_click(&icons[i]);
                        }
                    }
                }
            }
        }

        nanosleep(&ts, NULL);
    }

    /* Cleanup */
    munmap(g.fb, g.fb_size);
    close(g.fd);
    if (mfd >= 0) close(mfd);

    return 0;
}