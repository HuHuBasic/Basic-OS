const VM_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>Basic OS 虚拟机</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#000;font-family:'Segoe UI',system-ui,sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
body{display:flex;flex-direction:column}

/* 顶部工具栏 */
.toolbar{
  display:flex;align-items:center;gap:8px;padding:6px 12px;
  background:#1a1a2e;border-bottom:1px solid #2a2a4a;
  flex-shrink:0;flex-wrap:wrap;z-index:10;
}
.toolbar button{
  padding:5px 11px;border:1px solid #3a3a5a;border-radius:5px;
  background:#252540;color:#ccd;cursor:pointer;font-size:12px;
  white-space:nowrap;transition:all .15s;
}
.toolbar button:hover{background:#353560;border-color:#556}
.toolbar button:active{background:#454570}
.toolbar button.danger{color:#f88;border-color:#633}
.toolbar button.danger:hover{background:#4a2020}
.toolbar select{
  padding:4px 8px;border:1px solid #3a3a5a;border-radius:5px;
  background:#252540;color:#ccd;font-size:12px;cursor:pointer;
}
.toolbar .sep{width:1px;height:20px;background:#3a3a5a;margin:0 4px}
.toolbar .status{font-size:11px;color:#888;margin-left:auto}

/* 屏幕区域 */
.screen-wrapper{
  flex:1;display:flex;align-items:center;justify-content:center;
  background:#111;position:relative;overflow:hidden;
}
#screen_container{
  position:relative;overflow:hidden;
}
#screen_container canvas{display:block}
#bootOverlay{
  position:absolute;top:0;left:0;width:100%;height:100%;
  display:flex;align-items:center;justify-content:center;
  color:#fff;background:#000;font-size:14px;z-index:1;
  pointer-events:none;
}

/* 加载提示 */
.loading{
  display:flex;flex-direction:column;align-items:center;gap:16px;
  color:#aaa;font-size:14px;
}
.loading .spinner{
  width:36px;height:36px;border:3px solid #333;
  border-top-color:#68f;border-radius:50%;
  animation:spin .8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* 底部状态栏 */
.statusbar{
  display:flex;align-items:center;gap:16px;padding:4px 12px;
  background:#1a1a2e;border-top:1px solid #2a2a4a;
  flex-shrink:0;font-size:11px;color:#888;
}
.statusbar span{margin-right:4px}
.statusbar .led{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}
.statusbar .led.on{background:#4f4}
.statusbar .led.off{background:#444}

/* 虚拟键盘 */
#kbdToggle{background:#353560;border-color:#68f}
#kbdToggle.active{background:#68f;color:#fff}
#kbdPanel{
  display:none;flex-shrink:0;background:#1a1a2e;border-top:1px solid #2a2a4a;
  padding:4px 6px;user-select:none;-webkit-user-select:none;
}
#kbdPanel.show{display:block}
.kbd-row{display:flex;gap:3px;justify-content:center;margin:2px 0}
.kbd-row button{
  min-width:32px;height:38px;padding:2px 5px;
  border:1px solid #333;border-radius:5px;
  background:#2a2a40;color:#ccd;cursor:pointer;
  font-size:12px;font-family:monospace;
  touch-action:manipulation;transition:background .1s;
  -webkit-tap-highlight-color:transparent;
}
.kbd-row button:active{background:#68f;color:#fff;transform:scale(0.93)}
.kbd-row button.wide{min-width:50px}
.kbd-row button.xwide{min-width:68px}
.kbd-row button.special{background:#252540;color:#99f;font-size:11px}
.kbd-row button.enter{background:#364;color:#8f8;min-width:56px}
.kbd-row button.space{flex:1;max-width:320px}
.kbd-row button.cmdbtn{background:#353560;color:#8af;font-size:11px;min-width:42px}

@media (max-width:500px){
  .kbd-row button{min-width:26px;height:34px;padding:1px 3px;font-size:10px}
  .kbd-row button.wide{min-width:40px}
  .kbd-row button.xwide{min-width:54px}
  .kbd-row button.enter{min-width:44px}
  .kbd-row button.space{max-width:240px}
  .kbd-row button.cmdbtn{min-width:34px;font-size:9px}
  .kbd-row{gap:2px}
  .toolbar{padding:4px 8px;gap:4px}
  .toolbar button{padding:4px 8px;font-size:10px}
}

/* 快速输入栏 */
#quickInput{
  display:none;padding:4px 8px;background:#1a1a2e;border-top:1px solid #2a2a4a;
  flex-shrink:0;gap:6px;align-items:center;
}
#quickInput.show{display:flex}
#quickInput input{
  flex:1;padding:6px 10px;border:1px solid #3a3a5a;border-radius:4px;
  background:#111;color:#fff;font-family:monospace;font-size:13px;
  outline:none;
}
#quickInput input:focus{border-color:#68f}
#quickInput button{
  padding:6px 14px;border:1px solid #3a3a5a;border-radius:4px;
  background:#252540;color:#ccd;cursor:pointer;font-size:12px;
  white-space:nowrap;
}
#quickInput button.send{background:#364;border-color:#484;color:#8f8}

/* 浮动键盘按钮 */
#floatKbdBtn{
  display:none;position:absolute;bottom:10px;right:10px;z-index:5;
  width:44px;height:44px;border-radius:50%;border:2px solid rgba(100,140,255,.5);
  background:rgba(30,30,60,.85);color:#68f;font-size:20px;cursor:pointer;
  touch-action:manipulation;backdrop-filter:blur(4px);
  -webkit-backdrop-filter:blur(4px);
  align-items:center;justify-content:center;
  box-shadow:0 2px 12px rgba(0,0,0,.5);
  transition:all .2s;
}
#floatKbdBtn:active{background:rgba(100,140,255,.4);transform:scale(0.9)}
#floatKbdBtn.show{display:flex}
#floatKbdBtn.active{background:rgba(100,140,255,.5);color:#fff;border-color:#68f}
</style>
</head>
<body>

<div class="toolbar">
  <button onclick="vmControl('pause')" id="btnPause" disabled>⏸ 暂停</button>
  <button onclick="vmControl('reset')" id="btnReset" disabled>↺ 重置</button>
  <button onclick="vmToggleFullscreen()">⛶ 全屏</button>
  <span class="sep"></span>
  <select id="archSelect" onchange="switchArch()">
    <option value="freedos">💾 FreeDOS (推荐)</option>
    <option value="basic64">🖥️ Basic-OS 64位</option>
    <option value="basic32">🖥️ Basic-OS 32位</option>
    <option value="basic64-32">🖧 Basic-OS 64+32</option>
  </select>
  <span class="sep"></span>
  <button onclick="vmSave()" id="btnSave" disabled>💾 保存状态</button>
  <button onclick="vmLoad()" id="btnLoad" disabled>📂 加载状态</button>
  <span class="sep"></span>
  <button onclick="toggleKeyboard()" id="kbdToggle">⌨ 键盘</button>
  <span class="status" id="statusText">就绪</span>
</div>

<div class="screen-wrapper" id="screenWrapper">
  <div id="screen_container">
    <div style="white-space: pre; font: 14px monospace; line-height: 14px"></div>
    <canvas style="display: none"></canvas>
    <div id="bootOverlay">
      <div class="loading">
        <div class="spinner"></div>
        <div id="loadingText">正在加载 v86 模拟器...</div>
      </div>
    </div>
  </div>
  <button id="floatKbdBtn" onclick="toggleKeyboard()" title="键盘">⌨</button>
</div>

<!-- 快速输入栏 -->
<div id="quickInput">
  <input type="text" id="qInput" placeholder="输入命令后点发送..." autocomplete="off" autocorrect="off" autocapitalize="off">
  <button class="send" onclick="sendText()">发送 ⏎</button>
  <button onclick="sendSpecial('enter')">⏎</button>
  <button onclick="sendSpecial('backspace')">⌫</button>
  <button onclick="sendSpecial('escape')">Esc</button>
  <button onclick="sendSpecial('tab')">Tab</button>
</div>

<!-- 虚拟键盘 -->
<div id="kbdPanel">
  <div class="kbd-row">
    <button onclick="sendSpecial('escape')" class="special">Esc</button>
    <button onclick="sendKey('1')">1</button><button onclick="sendKey('2')">2</button><button onclick="sendKey('3')">3</button><button onclick="sendKey('4')">4</button><button onclick="sendKey('5')">5</button><button onclick="sendKey('6')">6</button><button onclick="sendKey('7')">7</button><button onclick="sendKey('8')">8</button><button onclick="sendKey('9')">9</button><button onclick="sendKey('0')">0</button><button onclick="sendKey('-')">-</button><button onclick="sendKey('=')">=</button>
    <button onclick="sendSpecial('backspace')" class="wide">⌫</button>
  </div>
  <div class="kbd-row">
    <button onclick="sendSpecial('tab')" class="wide special">Tab</button>
    <button onclick="sendKey('q')">q</button><button onclick="sendKey('w')">w</button><button onclick="sendKey('e')">e</button><button onclick="sendKey('r')">r</button><button onclick="sendKey('t')">t</button><button onclick="sendKey('y')">y</button><button onclick="sendKey('u')">u</button><button onclick="sendKey('i')">i</button><button onclick="sendKey('o')">o</button><button onclick="sendKey('p')">p</button><button onclick="sendKey('[')">[</button><button onclick="sendKey(']')">]</button>
    <button onclick="sendKey('\\\\')">\\</button>
  </div>
  <div class="kbd-row">
    <button onclick="sendSpecial('ctrl')" class="special wide">Ctrl</button>
    <button onclick="sendKey('a')">a</button><button onclick="sendKey('s')">s</button><button onclick="sendKey('d')">d</button><button onclick="sendKey('f')">f</button><button onclick="sendKey('g')">g</button><button onclick="sendKey('h')">h</button><button onclick="sendKey('j')">j</button><button onclick="sendKey('k')">k</button><button onclick="sendKey('l')">l</button><button onclick="sendKey(';')">;</button><button onclick="sendKey("'")">'</button>
    <button onclick="sendSpecial('enter')" class="enter wide">Enter</button>
  </div>
  <div class="kbd-row">
    <button onclick="sendSpecial('shift')" class="special wide">⇧</button>
    <button onclick="sendKey('z')">z</button><button onclick="sendKey('x')">x</button><button onclick="sendKey('c')">c</button><button onclick="sendKey('v')">v</button><button onclick="sendKey('b')">b</button><button onclick="sendKey('n')">n</button><button onclick="sendKey('m')">m</button><button onclick="sendKey(',')">,</button><button onclick="sendKey('.')">.</button><button onclick="sendKey('/')">/</button>
    <button onclick="sendSpecial('shift')" class="special wide">⇧</button>
  </div>
  <div class="kbd-row">
    <button onclick="sendSpecial('ctrl')" class="special">Ctrl</button>
    <button onclick="sendSpecial('alt')" class="special">Alt</button>
    <button onclick="sendKey(' ')" class="space">⎵ 空格</button>
    <button onclick="sendSpecial('alt')" class="special">Alt</button>
    <button onclick="sendSpecial('ctrl')" class="special">Ctrl</button>
    <button onclick="sendSpecial('left')" class="special">◀</button>
    <button onclick="sendSpecial('up')" class="special">▲</button>
    <button onclick="sendSpecial('down')" class="special">▼</button>
    <button onclick="sendSpecial('right')" class="special">▶</button>
  </div>
  <div class="kbd-row">
    <button onclick="sendTextCmd('dir')" class="cmdbtn">dir</button>
    <button onclick="sendTextCmd('ver')" class="cmdbtn">ver</button>
    <button onclick="sendTextCmd('cls')" class="cmdbtn">cls</button>
    <button onclick="sendTextCmd('invaders')" class="cmdbtn">invaders</button>
    <button onclick="sendTextCmd('snake')" class="cmdbtn">snake</button>
    <button onclick="sendTextCmd('tetris')" class="cmdbtn">tetris</button>
    <button onclick="sendTextCmd('fdapm poweroff')" class="cmdbtn">关机</button>
    <button onclick="sendSpecial('ctrl_c')" class="cmdbtn">Ctrl+C</button>
  </div>
</div>

<div class="statusbar">
  <span><span class="led off" id="ledPower"></span>运行: <b id="uptime">--</b></span>
  <span>速度: <b id="speed">--</b></span>
  <span>VGA: <b id="vgaMode">--</b></span>
  <span>鼠标: <b id="mouseStatus">--</b></span>
</div>

<script src="/v86/libv86.js"></script>
<script>
let emulator = null;
let vmRunning = false;
let vmPaused = false;
let startTime = 0;
let uptimeInterval = null;
let fullscreen = false;

// === VM 架构配置 ===
const archConfigs = {
  freedos: {
    label: 'FreeDOS',
    fda: { url: '/v86/images/freedos722.img', size: 737280 },
    boot_order: 0x1,
    memory: 64,
  },
  basic64: {
    label: 'Basic-OS 64位',
    cdrom: { url: '/iso/basic-os-64.iso', size: 5099520 },
    boot_order: 0x4,
    memory: 256,
  },
  basic32: {
    label: 'Basic-OS 32位',
    cdrom: { url: '/iso/basic-os-32.iso', size: 5179392 },
    boot_order: 0x4,
    memory: 256,
  },
  'basic64-32': {
    label: 'Basic-OS 64+32',
    cdrom: { url: '/iso/basic-os-64-32.iso', size: 5122048 },
    boot_order: 0x4,
    memory: 256,
  },
};

function getArchConfig() {
  const sel = document.getElementById('archSelect').value;
  return archConfigs[sel] || archConfigs.freedos;
}

// === 虚拟机控制 ===
function createVM() {
  const cfg = getArchConfig();
  const config = {
    wasm_path: '/v86/v86.wasm',
    memory_size: (cfg.memory || 64) * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    screen_container: document.getElementById('screen_container'),
    bios: { url: '/v86/bios/seabios.bin' },
    vga_bios: { url: '/v86/bios/vgabios.bin' },
    boot_order: cfg.boot_order || 0x1,
    autostart: true,
    disable_mouse: false,
    disable_keyboard: false,
  };

  if (cfg.fda) config.fda = cfg.fda;
  if (cfg.cdrom) config.cdrom = cfg.cdrom;

  const overlay = document.getElementById('bootOverlay');
  overlay.style.display = 'flex';
  document.getElementById('loadingText').textContent = '正在启动 ' + cfg.label + ' ...';

  try {
    emulator = new V86(config);
  } catch(e) {
    overlay.innerHTML = '<div class="loading"><div style="font-size:48px">⚠️</div><div>创建虚拟机失败: ' + e.message + '</div><button onclick="createVM()" style="margin-top:12px;padding:6px 16px;background:#68f;color:#fff;border:none;border-radius:4px;cursor:pointer">重试</button></div>';
    return;
  }

  emulator.add_listener('screen-set-mode', function(isGraphic) {
    if (overlay) overlay.style.display = 'none';
    document.getElementById('vgaMode').textContent = isGraphic ? '图形模式' : '文本模式 80x25';
  });

  emulator.add_listener('emulator-started', function() {
    vmRunning = true;
    vmPaused = false;
    startTime = Date.now();
    document.getElementById('statusText').textContent = '运行中';
    document.getElementById('ledPower').className = 'led on';
    updateButtons();
    updateUptime();
    uptimeInterval = setInterval(updateUptime, 1000);
    // 隐藏加载遮罩
    const ol = document.getElementById('bootOverlay');
    if (ol) { ol.style.opacity = '0'; setTimeout(() => { ol.style.display = 'none'; }, 400); }
  });

  emulator.add_listener('emulator-paused', function() {
    vmPaused = true;
    document.getElementById('statusText').textContent = '已暂停';
    updateButtons();
  });

  emulator.add_listener('emulator-resumed', function() {
    vmPaused = false;
    document.getElementById('statusText').textContent = '运行中';
    updateButtons();
  });

  emulator.add_listener('emulator-stopped', function() {
    vmRunning = false;
    if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
    document.getElementById('statusText').textContent = '已停止';
    document.getElementById('ledPower').className = 'led off';
    updateButtons();
  });

  emulator.add_listener('mouse-enable', function(enabled) {
    document.getElementById('mouseStatus').textContent = enabled ? '已捕获' : '无';
  });

  emulator.add_listener('download-progress', function(e) {
    const pct = Math.round(e.loaded / e.total * 100);
    document.getElementById('loadingText').textContent = '加载中... ' + pct + '%';
  });

  updateButtons();
}

function vmControl(action) {
  if (!emulator) return;
  switch(action) {
    case 'pause':
      if (vmPaused) {
        emulator.run();
      } else {
        emulator.stop();
      }
      break;
    case 'reset':
      if (confirm('确定要重置虚拟机吗？未保存的数据将丢失。')) {
        if (emulator) {
          try { emulator.destroy(); } catch(e) {}
          emulator = null;
        }
        vmRunning = false;
        vmPaused = false;
        if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
        document.getElementById('uptime').textContent = '--';
        document.getElementById('speed').textContent = '--';
        document.getElementById('ledPower').className = 'led off';
        document.getElementById('statusText').textContent = '就绪';
        updateButtons();
        createVM();
      }
      break;
  }
}

function vmToggleFullscreen() {
  const wrapper = document.getElementById('screenWrapper');
  if (!fullscreen) {
    if (wrapper.requestFullscreen) wrapper.requestFullscreen();
    else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
    fullscreen = true;
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    fullscreen = false;
  }
}

async function vmSave() {
  if (!emulator || !vmRunning) return;
  try {
    const state = await emulator.save_state();
    const blob = new Blob([state], {type: 'application/octet-stream'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vm-state-' + Date.now() + '.bin';
    a.click();
    URL.revokeObjectURL(a.href);
    document.getElementById('statusText').textContent = '状态已保存';
  } catch(e) {
    document.getElementById('statusText').textContent = '保存失败: ' + e.message;
  }
}

function vmLoad() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.bin';
  input.onchange = async function() {
    const file = input.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      if (emulator) {
        await emulator.restore_state(buf);
        document.getElementById('statusText').textContent = '状态已恢复';
      }
    } catch(e) {
      document.getElementById('statusText').textContent = '加载失败: ' + e.message;
    }
  };
  input.click();
}

let currentArch = 'freedos';

function switchArch() {
  if (emulator && vmRunning) {
    if (!confirm('切换架构将重启虚拟机，未保存的数据将丢失。确定继续？')) {
      document.getElementById('archSelect').value = currentArch;
      return;
    }
  }
  currentArch = document.getElementById('archSelect').value;
  if (emulator) {
    try { emulator.destroy(); } catch(e) {}
    emulator = null;
  }
  vmRunning = false;
  vmPaused = false;
  if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
  document.getElementById('uptime').textContent = '--';
  document.getElementById('speed').textContent = '--';
  document.getElementById('vgaMode').textContent = '--';
  document.getElementById('mouseStatus').textContent = '--';
  document.getElementById('ledPower').className = 'led off';
  document.getElementById('statusText').textContent = '就绪';
  updateButtons();
  createVM();
}

function updateUptime() {
  if (!vmRunning || vmPaused) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById('uptime').textContent = m + '分' + s + '秒';
}

function updateButtons() {
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');
  const btnSave = document.getElementById('btnSave');
  const btnLoad = document.getElementById('btnLoad');
  const sel = document.getElementById('archSelect');

  if (vmRunning) {
    btnPause.disabled = false;
    btnPause.textContent = vmPaused ? '▶ 继续' : '⏸ 暂停';
    btnReset.disabled = false;
    btnSave.disabled = false;
    btnLoad.disabled = false;
    sel.disabled = true;
  } else {
    btnPause.disabled = true;
    btnPause.textContent = '⏸ 暂停';
    btnReset.disabled = true;
    btnSave.disabled = true;
    btnLoad.disabled = false;
    sel.disabled = false;
  }
}

// === 键盘快捷键 ===
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.altKey) {
    switch(e.key.toLowerCase()) {
      case 'p': e.preventDefault(); vmControl('pause'); break;
      case 'r': e.preventDefault(); vmControl('reset'); break;
      case 'f': e.preventDefault(); vmToggleFullscreen(); break;
    }
  }
});

// === 虚拟键盘 ===
let kbdVisible = false;
let shiftDown = false;
let ctrlDown = false;
let altDown = false;

// PS/2 键盘扫描码 Set 1 (make codes)
const SCANCODES = {
  'escape': 0x01, '1': 0x02, '2': 0x03, '3': 0x04, '4': 0x05, '5': 0x06,
  '6': 0x07, '7': 0x08, '8': 0x09, '9': 0x0A, '0': 0x0B, '-': 0x0C, '=': 0x0D,
  'backspace': 0x0E, 'tab': 0x0F, 'q': 0x10, 'w': 0x11, 'e': 0x12, 'r': 0x13,
  't': 0x14, 'y': 0x15, 'u': 0x16, 'i': 0x17, 'o': 0x18, 'p': 0x19,
  '[': 0x1A, ']': 0x1B, 'enter': 0x1C, 'ctrl': 0x1D, 'a': 0x1E, 's': 0x1F,
  'd': 0x20, 'f': 0x21, 'g': 0x22, 'h': 0x23, 'j': 0x24, 'k': 0x25,
  'l': 0x26, ';': 0x27, "'": 0x28, '\`': 0x29, 'shift_l': 0x2A, '\\\\': 0x2B,
  'z': 0x2C, 'x': 0x2D, 'c': 0x2E, 'v': 0x2F, 'b': 0x30, 'n': 0x31,
  'm': 0x32, ',': 0x33, '.': 0x34, '/': 0x35, 'shift_r': 0x36,
  'alt': 0x38, ' ': 0x39, 'capslock': 0x3A,
  'f1': 0x3B, 'f2': 0x3C, 'f3': 0x3D, 'f4': 0x3E, 'f5': 0x3F,
  'f6': 0x40, 'f7': 0x41, 'f8': 0x42, 'f9': 0x43, 'f10': 0x44,
  'up': 0x48, 'left': 0x4B, 'right': 0x4D, 'down': 0x50,
};

function kbdSendCodes(codes) {
  if (!emulator || !vmRunning) return;
  try { emulator.keyboard_send_scancodes(codes); } catch(e) {}
}

function sendKey(key) {
  if (!emulator || !vmRunning) return;
  const make = SCANCODES[key];
  if (make === undefined) return;
  const brk = make | 0x80;
  const codes = [];
  if (shiftDown) codes.push(SCANCODES['shift_l']);
  codes.push(make, brk);
  if (shiftDown) codes.push(SCANCODES['shift_l'] | 0x80);
  kbdSendCodes(codes);
  if (shiftDown) { shiftDown = false; }
}

function sendSpecial(action) {
  if (!emulator || !vmRunning) return;
  switch(action) {
    case 'enter':
      kbdSendCodes([SCANCODES['enter'], SCANCODES['enter'] | 0x80]);
      break;
    case 'backspace':
      kbdSendCodes([SCANCODES['backspace'], SCANCODES['backspace'] | 0x80]);
      break;
    case 'escape':
      kbdSendCodes([SCANCODES['escape'], SCANCODES['escape'] | 0x80]);
      break;
    case 'tab':
      kbdSendCodes([SCANCODES['tab'], SCANCODES['tab'] | 0x80]);
      break;
    case 'shift':
      shiftDown = !shiftDown;
      break;
    case 'ctrl':
      if (ctrlDown) {
        kbdSendCodes([SCANCODES['ctrl'] | 0x80]);
        ctrlDown = false;
      } else {
        kbdSendCodes([SCANCODES['ctrl']]);
        ctrlDown = true;
      }
      break;
    case 'alt':
      if (altDown) {
        kbdSendCodes([SCANCODES['alt'] | 0x80]);
        altDown = false;
      } else {
        kbdSendCodes([SCANCODES['alt']]);
        altDown = true;
      }
      break;
    case 'ctrl_c':
      kbdSendCodes([SCANCODES['ctrl'], SCANCODES['c'], SCANCODES['c'] | 0x80, SCANCODES['ctrl'] | 0x80]);
      break;
    case 'up':
      kbdSendCodes([0xE0, SCANCODES['up'], 0xE0, SCANCODES['up'] | 0x80]);
      break;
    case 'down':
      kbdSendCodes([0xE0, SCANCODES['down'], 0xE0, SCANCODES['down'] | 0x80]);
      break;
    case 'left':
      kbdSendCodes([0xE0, SCANCODES['left'], 0xE0, SCANCODES['left'] | 0x80]);
      break;
    case 'right':
      kbdSendCodes([0xE0, SCANCODES['right'], 0xE0, SCANCODES['right'] | 0x80]);
      break;
  }
}

function sendText() {
  const input = document.getElementById('qInput');
  const text = input.value;
  if (!text) return;
  sendTextCmd(text);
  input.value = '';
}

function sendTextCmd(text) {
  if (!emulator || !vmRunning) return;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\n') {
      kbdSendCodes([SCANCODES['enter'], SCANCODES['enter'] | 0x80]);
    } else {
      const key = ch.toLowerCase();
      const make = SCANCODES[key];
      if (make !== undefined) {
        const isUpper = ch !== key;
        const codes = [];
        if (isUpper) codes.push(SCANCODES['shift_l']);
        codes.push(make, make | 0x80);
        if (isUpper) codes.push(SCANCODES['shift_l'] | 0x80);
        kbdSendCodes(codes);
      }
    }
  }
  // 自动按回车
  setTimeout(() => {
    kbdSendCodes([SCANCODES['enter'], SCANCODES['enter'] | 0x80]);
  }, text.length * 15 + 30);
}

function toggleKeyboard() {
  kbdVisible = !kbdVisible;
  const panel = document.getElementById('kbdPanel');
  const input = document.getElementById('quickInput');
  const btn = document.getElementById('kbdToggle');
  const floatBtn = document.getElementById('floatKbdBtn');
  if (kbdVisible) {
    panel.classList.add('show');
    input.classList.add('show');
    btn.classList.add('active');
    btn.textContent = '⌨ 收起';
    if (floatBtn) { floatBtn.classList.add('active'); floatBtn.textContent = '✕'; }
    setTimeout(() => document.getElementById('qInput').focus(), 100);
  } else {
    panel.classList.remove('show');
    input.classList.remove('show');
    btn.classList.remove('active');
    btn.textContent = '⌨ 键盘';
    if (floatBtn) { floatBtn.classList.remove('active'); floatBtn.textContent = '⌨'; }
  }
}

// 快速输入栏回车键发送
document.getElementById('qInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendText();
  }
});

// === 触摸屏自动检测 ===
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
}

// === 启动 ===
window.addEventListener('load', function() {
  createVM();
  // 触摸设备自动显示键盘和浮动按钮
  if (isTouchDevice()) {
    const floatBtn = document.getElementById('floatKbdBtn');
    if (floatBtn) floatBtn.classList.add('show');
    setTimeout(() => { if (!kbdVisible) toggleKeyboard(); }, 1500);
  }
});
</script>
</body>
</html>`;

// Cloudflare Worker for Basic-OS VM
// Proxies v86 resources from copy.sh and serves VM page with COOP/COEP headers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main';

// BPB patching for corrupt Basic-OS ISO files
const ISO_BPB_PATCH = {
  '/basic-os-64.iso':    { size: 5099520, sectors: 9960,  spf: 30 },
  '/basic-os-32.iso':    { size: 5179392, sectors: 10116, spf: 30 },
  '/basic-os-64-32.iso': { size: 5122048, sectors: 10004, spf: 30 },
};

function getMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const mimes = {
    js: 'application/javascript',
    wasm: 'application/wasm',
    bin: 'application/octet-stream',
    img: 'application/octet-stream',
    iso: 'application/octet-stream',
    html: 'text/html; charset=utf-8',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    ttf: 'font/ttf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return mimes[ext] || 'application/octet-stream';
}

function patchBPB(buffer, totalSectors, sectorsPerFat) {
  const data = new Uint8Array(buffer);
  if (data[0x0B] !== 0x90 || data[0x0C] !== 0x90) return buffer;
  const view = new DataView(buffer);
  view.setUint16(0x0B, 512, true);
  data[0x0D] = 1;
  view.setUint16(0x0E, 1, true);
  data[0x10] = 2;
  view.setUint16(0x11, 224, true);
  view.setUint16(0x13, 0, true);
  data[0x15] = 0xF0;
  view.setUint16(0x16, sectorsPerFat, true);
  view.setUint16(0x18, 63, true);
  view.setUint16(0x1A, 16, true);
  view.setUint32(0x1C, 0, true);
  view.setUint32(0x20, totalSectors, true);
  return buffer;
}

function patchBootCatalog(buffer) {
  const data = new Uint8Array(buffer);
  const BOOT_RECORD_OFFSET = 0x8000;
  const BOOT_CATALOG_PTR_OFFSET = BOOT_RECORD_OFFSET + 0x47;
  if (buffer.byteLength <= BOOT_CATALOG_PTR_OFFSET + 4) return buffer;
  const view = new DataView(buffer);
  const currentPtr = view.getUint32(BOOT_CATALOG_PTR_OFFSET, true);
  if (currentPtr === 32) {
    view.setUint32(BOOT_CATALOG_PTR_OFFSET, 48, true);
  }
  return buffer;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;

  // Serve main page
  if (path === '/' || path === '/index.html') {
    const html = VM_HTML_TEMPLATE;
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Proxy v86 resources
  // libv86.js and v86.wasm from npm (jsdelivr) - proper API with add_listener
  // BIOS, images from copy.sh
  if (path.startsWith('/v86/') || path.startsWith('/build/')) {
    let v86Path;
    let v86Url;
    if (path.startsWith('/v86/')) {
      v86Path = path.substring('/v86'.length);
      // Map root-level files to /build/ directory
      const rootFiles = ['/v86_all.js', '/v86.wasm', '/libv86.js', '/libv86.mjs', '/libv86-debug.js', '/v86-fallback.wasm', '/v86.css', '/xterm.js'];
      if (rootFiles.includes(v86Path)) {
        v86Path = '/build' + v86Path;
      }
    } else {
      v86Path = path; // /build/... already has correct structure
    }
    
    // libv86.js and v86.wasm from npm package (jsdelivr) - has proper API
    if (v86Path === '/build/libv86.js' || v86Path === '/build/v86.wasm') {
      v86Url = 'https://cdn.jsdelivr.net/npm/v86@0.5.44' + v86Path;
    } else {
      v86Url = 'https://copy.sh/v86' + v86Path;
    }
    try {
      const resp = await fetch(v86Url);
      if (!resp.ok) return new Response('v86 resource not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': getMime(v86Path),
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch(e) {
      return new Response('v86 proxy error: ' + e.message, { status: 503 });
    }
  }

  // Proxy ISO files from GitHub with BPB patching
  if (path.startsWith('/iso/')) {
    const isoName = path.substring('/iso'.length);
    const isoUrl = GITHUB_RAW + isoName;
    try {
      const resp = await fetch(isoUrl);
      if (!resp.ok) return new Response('ISO not found', { status: 404 });
      const buffer = await resp.arrayBuffer();
      let patched = buffer;
      const patch = ISO_BPB_PATCH[isoName];
      if (patch) {
        patched = patchBPB(buffer, patch.sectors, patch.spf);
        patched = patchBootCatalog(patched);
      }
      return new Response(patched, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': String(patched.byteLength),
        },
      });
    } catch(e) {
      return new Response('ISO proxy error: ' + e.message, { status: 503 });
    }
  }

  // Proxy other static files from GitHub
  try {
    const ghUrl = GITHUB_RAW + path;
    const resp = await fetch(ghUrl);
    if (!resp.ok) return new Response('Not Found', { status: 404 });
    return new Response(resp.body, {
      headers: {
        'Content-Type': getMime(path),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch(e) {
    return new Response('Service Unavailable', { status: 503 });
  }
}