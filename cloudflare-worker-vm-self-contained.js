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
.os-label{font-size:12px;color:#8cf;padding:5px 0;font-weight:600;white-space:nowrap}

/* 屏幕区域 */
.screen-wrapper{
  flex:1;display:flex;align-items:center;justify-content:center;
  background:#111;position:relative;overflow:hidden;
}
#screen_container{
  position:relative;overflow:hidden;
  width:100%;height:100%;min-width:320px;min-height:300px;
}
#screen_container canvas{display:block}
/* 启动覆盖层 - Windows 安装风格 */
#bootOverlay{
  position:absolute;top:0;left:0;width:100%;height:100%;
  color:#fff;background:#000;z-index:1;pointer-events:none;
  font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;
}
.boot-setup{
  width:100%;height:100%;display:flex;flex-direction:column;
  background:linear-gradient(180deg,#0055aa 0%,#003366 100%);
}
.boot-setup-header{
  padding:20px 30px 8px;text-align:center;
}
.boot-setup-header h2{
  font-size:22px;font-weight:400;color:#fff;letter-spacing:1px;
  text-shadow:0 1px 3px rgba(0,0,0,.5);
}
.boot-setup-header .subtitle{
  font-size:12px;color:rgba(255,255,255,.7);margin-top:4px;
}
.boot-setup-body{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:0 30px;
}
.boot-setup-body .os-icon{
  width:80px;height:80px;border-radius:16px;
  background:rgba(255,255,255,.15);display:flex;align-items:center;
  justify-content:center;font-size:40px;margin-bottom:20px;
  box-shadow:0 4px 20px rgba(0,0,0,.3);
}
.boot-setup-body .msg{
  font-size:16px;color:#fff;text-align:center;margin-bottom:8px;
}
.boot-setup-body .detail{
  font-size:12px;color:rgba(255,255,255,.6);text-align:center;
}
.boot-setup-progress{
  padding:0 30px 20px;
}
.boot-setup-progress .bar-track{
  height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;
  margin-bottom:8px;
}
.boot-setup-progress .bar-fill{
  height:100%;background:linear-gradient(90deg,#00cc44,#00ff66);
  border-radius:3px;transition:width .3s;width:0%;
}
.boot-setup-progress .steps{
  display:flex;justify-content:space-between;font-size:10px;
  color:rgba(255,255,255,.5);
}
.boot-setup-footer{
  padding:10px 30px;text-align:center;font-size:10px;
  color:rgba(255,255,255,.4);border-top:1px solid rgba(255,255,255,.1);
}
.boot-setup-footer .spinner-inline{
  display:inline-block;width:10px;height:10px;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;
  vertical-align:middle;margin-right:6px;
}
.boot-start-btn{
  display:block;margin:16px auto 0;padding:16px 56px;
  background:linear-gradient(180deg,#00cc44 0%,#009933 100%);
  color:#fff;border:3px solid rgba(255,255,255,.4);border-radius:10px;
  font-size:20px;font-weight:700;cursor:pointer;letter-spacing:3px;
  box-shadow:0 4px 24px rgba(0,200,68,.5),0 0 40px rgba(0,200,68,.2);
  transition:all .2s;pointer-events:auto;
  animation:pulse 2s ease-in-out infinite;
}
@keyframes pulse{
  0%,100%{box-shadow:0 4px 24px rgba(0,200,68,.5),0 0 40px rgba(0,200,68,.2)}
  50%{box-shadow:0 4px 32px rgba(0,255,100,.7),0 0 60px rgba(0,255,100,.4)}
}
.boot-start-btn:hover{background:linear-gradient(180deg,#00ee55 0%,#00bb44 100%);transform:translateY(-3px);box-shadow:0 8px 30px rgba(0,255,100,.6),0 0 50px rgba(0,255,100,.4);animation:none}
.boot-start-btn:active{transform:scale(0.95);box-shadow:0 2px 12px rgba(0,170,68,.4);animation:none}
@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;flex-direction:column;align-items:center;gap:16px;color:#aaa;font-size:14px}
.loading .spinner{width:36px;height:36px;border:3px solid #333;border-top-color:#68f;border-radius:50%;animation:spin .8s linear infinite}

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
  <select id="archSelect" onchange="switchArch()" style="padding:4px 8px;border:1px solid #3a3a5a;border-radius:5px;background:#252540;color:#8cf;font-size:12px;cursor:pointer;font-weight:600">
    <option value="basic32">🖥️ Basic-OS 32位</option>
    <option value="basic64">🖥️ Basic-OS 64位</option>
    <option value="basic6432">🖥️ Basic-OS 64+32位</option>
  </select>
  <span class="sep"></span>
  <button onclick="vmSave()" id="btnSave" disabled>💾 保存状态</button>
  <button onclick="vmLoad()" id="btnLoad" disabled>📂 加载状态</button>
  <span class="sep"></span>
  <button onclick="toggleKeyboard()" id="kbdToggle">⌨ 键盘</button>
  <span class="status" id="statusText">👆 请点击下方按钮启动系统</span>
</div>

<div class="screen-wrapper" id="screenWrapper">
  <div id="screen_container">
    <div style="white-space: pre; font: 14px monospace; line-height: 14px"></div>
    <canvas style="display: none"></canvas>
    <div id="bootOverlay">
      <div class="boot-setup">
        <div class="boot-setup-header">
          <h2>Basic OS</h2>
          <div class="subtitle" id="loadingSubtitle">浏览器中的真实操作系统 · 图形桌面 800x600</div>
        </div>
        <div class="boot-setup-body">
          <div class="os-icon">🖥️</div>
          <div class="msg" id="loadingText">点击下方按钮启动系统</div>
          <div class="detail" id="loadingDetail">图形桌面 800x600 · 支持鼠标 · 上方可选版本<br>32位 / 64位 / 64+32位 自由切换</div>
          <button id="bootStartBtn" onclick="startBoot()" class="boot-start-btn">▶ 启动系统</button>
        </div>
        <div class="boot-setup-progress" id="bootProgressWrap" style="display:none">
          <div class="bar-track"><div class="bar-fill" id="bootProgressBar"></div></div>
          <div class="steps">
            <span>⬇ 加载资源</span><span>📦 初始化</span><span>⚙ 引导系统</span><span>▶ 启动</span>
          </div>
        </div>
        <div class="boot-setup-footer">
          点击"启动系统"后，等待几秒即可进入操作系统
        </div>
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
// 空白硬盘镜像 (用于 ReactOS 安装)
let blankHddBuffer = null;
function getBlankHdd() {
  if (!blankHddBuffer) {
    const sizeMB = 512;
    const byteSize = sizeMB * 1024 * 1024;
    blankHddBuffer = new ArrayBuffer(byteSize);
  }
  return { buffer: blankHddBuffer };
}

const archConfigs = {
  freedos: {
    label: 'FreeDOS',
    fda: { url: '/v86/images/freedos722.img', size: 737280 },
    boot_order: 0x1,
    memory: 64,
  },
  'reactos-live': {
    label: 'ReactOS Live (图形桌面)',
    cdrom: { url: '/iso/reactos-livecd.iso', async: true },
    boot_order: 0x4,
    memory: 512,
    vga_memory: 32,
  },
  'reactos-boot': {
    label: 'ReactOS 安装版',
    cdrom: { url: '/iso/reactos-bootcd.iso', async: true },
    hda: null, // 动态设置
    boot_order: 0x4,
    memory: 512,
    vga_memory: 32,
  },
  basic32: {
    label: 'Basic-OS 32位 (图形桌面)',
    cdrom: { url: '/iso/basic-os-32.iso?v=19', size: 5179392, async: true },
    boot_order: 0x4,
    memory: 256,
    vga_memory: 32,
  },
  basic64: {
    label: 'Basic-OS 64位 (图形桌面)',
    cdrom: { url: '/iso/basic-os-64.iso?v=1', size: 5099520, async: true },
    boot_order: 0x4,
    memory: 256,
    vga_memory: 32,
  },
  basic6432: {
    label: 'Basic-OS 64+32位 (图形桌面)',
    cdrom: { url: '/iso/basic-os-64-32.iso?v=1', size: 5122048, async: true },
    boot_order: 0x4,
    memory: 256,
    vga_memory: 32,
  },
};

function getArchConfig() {
  return archConfigs[currentArch] || archConfigs.basic32;
}

// === 启动按钮 ===
// 预缓存的 ISO 镜像
let cachedIsoBuffer = null;
let cachedIsoArch = null;

function startBoot() {
  const cfg = getArchConfig();
  const btn = document.getElementById('bootStartBtn');
  if (btn) btn.style.display = 'none';
  const progressWrap = document.getElementById('bootProgressWrap');
  if (progressWrap) progressWrap.style.display = 'block';
  document.getElementById('loadingText').textContent = '正在准备启动...';
  document.getElementById('loadingSubtitle').textContent = cfg.label;
  
  const overlay = document.getElementById('bootOverlay');
  overlay.style.display = 'flex';
  document.getElementById('loadingSubtitle').textContent = '正在准备启动环境...';
  document.getElementById('loadingText').textContent = '正在下载 ' + cfg.label + ' ...';
  const detailEl = document.getElementById('loadingDetail');
  if (detailEl) detailEl.textContent = '请稍候，正在从网络加载系统资源';
  const footerEl = overlay.querySelector('.boot-setup-footer');
  if (footerEl) footerEl.innerHTML = '<span class="spinner-inline"></span>正在下载镜像文件...';
  const bar = document.getElementById('bootProgressBar');
  if (bar) bar.style.width = '0%';

  // 先下载 ISO，再启动虚拟机，避免异步加载时序问题
  if (cachedIsoBuffer && cachedIsoArch === currentArch) {
    createVM(cachedIsoBuffer);
  } else {
    cachedIsoBuffer = null;
    const url = cfg.cdrom.url + '&_t=' + Date.now();
    fetchIsoAndBoot(url);
  }
}

function fetchIsoAndBoot(url) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';

  xhr.onprogress = function(e) {
    if (e.lengthComputable) {
      const pct = Math.round(e.loaded / e.total * 100);
      const bar = document.getElementById('bootProgressBar');
      if (bar) bar.style.width = pct + '%';
      document.getElementById('loadingText').textContent = '正在下载镜像文件... ' + pct + '%';
      const footerEl = document.querySelector('.boot-setup-footer');
      if (footerEl) footerEl.innerHTML = '<span class="spinner-inline"></span>已下载 ' + (e.loaded / 1024 / 1024).toFixed(1) + ' MB / ' + (e.total / 1024 / 1024).toFixed(1) + ' MB';
    }
  };

  xhr.onload = function() {
    if (xhr.status === 200) {
      cachedIsoBuffer = xhr.response;
      cachedIsoArch = currentArch;
      document.getElementById('loadingText').textContent = '下载完成，正在启动...';
      document.getElementById('loadingSubtitle').textContent = '镜像加载完成，正在引导系统';
      const bar = document.getElementById('bootProgressBar');
      if (bar) bar.style.width = '100%';
      const footerEl = document.querySelector('.boot-setup-footer');
      if (footerEl) footerEl.innerHTML = '<span class="spinner-inline"></span>正在初始化虚拟机...';
      createVM(cachedIsoBuffer);
    } else {
      const overlay = document.getElementById('bootOverlay');
      overlay.innerHTML = '<div class="loading"><div style="font-size:48px">⚠️</div><div>镜像下载失败 (HTTP ' + xhr.status + ')</div><button onclick="startBoot()" style="margin-top:12px;padding:6px 16px;background:#68f;color:#fff;border:none;border-radius:4px;cursor:pointer;pointer-events:auto">重试</button></div>';
    }
  };

  xhr.onerror = function() {
    const overlay = document.getElementById('bootOverlay');
    overlay.innerHTML = '<div class="loading"><div style="font-size:48px">⚠️</div><div>网络错误，无法下载镜像</div><button onclick="startBoot()" style="margin-top:12px;padding:6px 16px;background:#68f;color:#fff;border:none;border-radius:4px;cursor:pointer;pointer-events:auto">重试</button></div>';
  };

  xhr.send();
}

// === 虚拟机控制 ===
function createVM(isoBuffer) {
  const cfg = getArchConfig();
  const vgaMem = (cfg.vga_memory || 8) * 1024 * 1024;
  const config = {
    wasm_path: '/v86/v86.wasm',
    memory_size: (cfg.memory || 64) * 1024 * 1024,
    vga_memory_size: vgaMem,
    screen_container: document.getElementById('screen_container'),
    bios: { url: '/v86/bios/seabios.bin' },
    vga_bios: { url: '/v86/bios/vgabios.bin' },
    boot_order: cfg.boot_order || 0x1,
    autostart: true,
    disable_mouse: false,
    disable_keyboard: false,
  };

  // 使用预下载的 ISO buffer，而不是 URL
  if (isoBuffer) {
    config.cdrom = { buffer: isoBuffer };
  } else if (cfg.fda) {
    config.fda = cfg.fda;
  }

  if (cfg.hda === null) {
    config.hda = getBlankHdd();
  } else if (cfg.hda) {
    config.hda = cfg.hda;
  }

  try {
    emulator = new V86(config);
  } catch(e) {
    const overlay = document.getElementById('bootOverlay');
    overlay.innerHTML = '<div class="loading"><div style="font-size:48px">⚠️</div><div>创建虚拟机失败: ' + e.message + '</div><button onclick="startBoot()" style="margin-top:12px;padding:6px 16px;background:#68f;color:#fff;border:none;border-radius:4px;cursor:pointer;pointer-events:auto">重试</button></div>';
    return;
  }

  const overlay = document.getElementById('bootOverlay');

  emulator.add_listener('screen-set-mode', function(isGraphic) {
    if (overlay) overlay.style.display = 'none';
    if (isGraphic) {
      document.getElementById('vgaMode').textContent = '图形 800x600x32';
    } else {
      document.getElementById('vgaMode').textContent = '文本 80x25';
    }
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
        createVM(cachedIsoBuffer);
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

let currentArch = 'basic32';

function switchArch() {
  const newArch = document.getElementById('archSelect').value;
  if (newArch === currentArch) return;
  
  if (emulator && vmRunning) {
    if (!confirm('切换版本将重启虚拟机，未保存的数据将丢失。确定继续？')) {
      document.getElementById('archSelect').value = currentArch;
      return;
    }
  }
  currentArch = newArch;
  // 清除旧缓存
  cachedIsoBuffer = null;
  cachedIsoArch = null;
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
  document.getElementById('statusText').textContent = '已切换至 ' + getArchConfig().label + '，点击下方按钮启动';
  updateButtons();
  
  // 重置启动界面
  const overlay = document.getElementById('bootOverlay');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  const btn = document.getElementById('bootStartBtn');
  if (btn) btn.style.display = 'block';
  const progressWrap = document.getElementById('bootProgressWrap');
  if (progressWrap) progressWrap.style.display = 'none';
  document.getElementById('loadingText').textContent = '点击下方按钮启动系统';
  document.getElementById('loadingSubtitle').textContent = getArchConfig().label;
  const detailEl = document.getElementById('loadingDetail');
  if (detailEl) detailEl.textContent = '图形桌面 800x600 · 支持鼠标 · 上方可选版本';
  const footerEl = overlay.querySelector('.boot-setup-footer');
  if (footerEl) footerEl.innerHTML = '点击"启动系统"后，等待几秒即可进入操作系统';
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

  if (vmRunning) {
    btnPause.disabled = false;
    btnPause.textContent = vmPaused ? '▶ 继续' : '⏸ 暂停';
    btnReset.disabled = false;
    btnSave.disabled = false;
    btnLoad.disabled = false;
  } else {
    btnPause.disabled = true;
    btnPause.textContent = '⏸ 暂停';
    btnReset.disabled = true;
    btnSave.disabled = true;
    btnLoad.disabled = false;
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
  // 不自动启动，等待用户点击"启动系统"按钮
  // 触摸设备自动显示浮动键盘按钮
  if (isTouchDevice()) {
    const floatBtn = document.getElementById('floatKbdBtn');
    if (floatBtn) floatBtn.classList.add('show');
  }
});
</script>
</body>
</html>`;

// ============================================================
// 总官网首页 HTML (用于 Basichu.de5.net)
// ============================================================
const MAIN_SITE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>basic OS - Lightweight Linux Operating System</title>
<style>
  :root {
    --bg: #0a0e17;
    --bg2: #111827;
    --bg3: #1a2332;
    --accent: #3b82f6;
    --accent2: #60a5fa;
    --text: #e2e8f0;
    --text2: #94a3b8;
    --border: #1e293b;
    --green: #22c55e;
    --radius: 12px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    overflow-x: hidden;
  }
  /* Navigation */
  .nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: rgba(10,14,23,0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    z-index: 1000;
    padding: 0 24px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-logo {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .nav-logo .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 1.1rem;
    color: #fff;
  }
  .nav-links { display: flex; gap: 8px; align-items: center; }
  .nav-links a {
    color: var(--text2);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 8px;
    transition: all .2s;
    font-size: .9rem;
  }
  .nav-links a:hover { color: var(--text); background: var(--bg3); }
  .nav-links a.download-btn {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }
  .nav-links a.download-btn:hover { background: #2563eb; }
  /* Language Switch */
  .lang-switch {
    display: flex;
    gap: 4px;
    margin-left: 16px;
    background: var(--bg3);
    border-radius: 8px;
    padding: 3px;
  }
  .lang-switch button {
    background: none;
    border: none;
    color: var(--text2);
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: .8rem;
    transition: all .2s;
  }
  .lang-switch button.active {
    background: var(--accent);
    color: #fff;
  }
  .lang-switch button:hover:not(.active) { color: var(--text); }
  /* Hero */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 120px 24px 80px;
    position: relative;
    background: 
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.15), transparent),
      radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.1), transparent);
  }
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(59,130,246,0.1);
    border: 1px solid rgba(59,130,246,0.3);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: .85rem;
    color: var(--accent2);
    margin-bottom: 32px;
  }
  .hero-badge .dot {
    width: 8px; height: 8px;
    background: var(--green);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .hero h1 {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
    background: linear-gradient(135deg, var(--text), var(--accent2), #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero p {
    font-size: 1.2rem;
    color: var(--text2);
    max-width: 600px;
    margin-bottom: 40px;
  }
  .hero-buttons {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 100px;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    transition: all .25s;
    cursor: pointer;
    border: none;
  }
  .btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 4px 20px rgba(59,130,246,0.4);
  }
  .btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(59,130,246,0.5); }
  .btn-outline {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-outline:hover { background: var(--bg3); border-color: var(--accent); }
  /* Sections */
  section {
    padding: 100px 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .section-title {
    text-align: center;
    margin-bottom: 60px;
  }
  .section-title h2 {
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .section-title p { color: var(--text2); font-size: 1.1rem; }
  /* Feature Grid */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
  }
  .feature-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px 28px;
    transition: all .3s;
  }
  .feature-card:hover {
    border-color: var(--accent);
    transform: translateY(-4px);
    box-shadow: 0 8px 40px rgba(59,130,246,0.1);
  }
  .feature-icon {
    width: 48px; height: 48px;
    background: rgba(59,130,246,0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 16px;
  }
  .feature-card h3 { font-size: 1.1rem; margin-bottom: 8px; }
  .feature-card p { color: var(--text2); font-size: .9rem; }
  /* Specs */
  .specs {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px;
    margin-top: 40px;
  }
  .specs h3 { margin-bottom: 24px; font-size: 1.3rem; }
  .spec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  .spec-item {
    background: var(--bg3);
    border-radius: 8px;
    padding: 16px;
  }
  .spec-item .label { color: var(--text2); font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
  .spec-item .value { font-size: 1.1rem; font-weight: 600; margin-top: 4px; }
  /* Download Section */
  .download-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
    max-width: 900px;
    margin: 0 auto;
  }
  .download-card {
    background: linear-gradient(135deg, var(--bg2), var(--bg3));
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px 32px;
    text-align: center;
    position: relative;
    transition: all .3s;
  }
  .download-card:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
  }
  .download-card.beta {
    border-color: rgba(168,85,247,0.4);
    background: linear-gradient(135deg, var(--bg2), rgba(139,92,246,0.08));
  }
  .download-card.beta:hover {
    border-color: #a855f7;
  }
  .download-card .edition-badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 100px;
    font-size: .75rem;
    font-weight: 700;
    letter-spacing: .03em;
    margin-bottom: 16px;
  }
  .download-card .edition-badge.stable-badge {
    background: rgba(34,197,94,0.15);
    color: var(--green);
    border: 1px solid rgba(34,197,94,0.3);
  }
  .download-card .edition-badge.beta-badge {
    background: rgba(168,85,247,0.15);
    color: #a855f7;
    border: 1px solid rgba(168,85,247,0.3);
  }
  .download-card h3 {
    font-size: 1.4rem;
    margin-bottom: 4px;
  }
  .download-card .edition-subtitle {
    font-size: .85rem;
    color: var(--text2);
    margin-bottom: 16px;
  }
  .download-card .file-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text2);
    font-size: .9rem;
    margin: 16px 0;
  }
  .download-card .checksum {
    font-family: monospace;
    font-size: .8rem;
    color: var(--text2);
    background: var(--bg3);
    padding: 8px 16px;
    border-radius: 8px;
    display: inline-block;
    margin-top: 12px;
    word-break: break-all;
  }
  .download-card .activation-info {
    background: rgba(168,85,247,0.08);
    border: 1px dashed rgba(168,85,247,0.25);
    border-radius: 8px;
    padding: 12px 16px;
    margin-top: 16px;
    font-size: .82rem;
    color: #c4b5fd;
    line-height: 1.5;
  }
  .download-card .activation-info strong {
    color: #a78bfa;
  }
  /* Sponsor */
  .sponsor-card {
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #6366f1 100%);
    border-radius: var(--radius);
    padding: 48px 32px;
    text-align: center;
    max-width: 520px;
    margin: 0 auto;
    box-shadow: 0 8px 40px rgba(124,58,237,0.25);
    position: relative;
    overflow: hidden;
  }
  .sponsor-card::before {
    content: '';
    position: absolute;
    top: -50%; left: -50%;
    width: 200%; height: 200%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(255,255,255,0.05) 0%, transparent 50%);
  }
  .sponsor-icon {
    position: relative;
    margin-bottom: 16px;
  }
  .sponsor-text {
    position: relative;
    color: rgba(255,255,255,0.8);
    font-size: 1rem;
    margin-bottom: 24px;
  }
  .afdian-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #fff;
    color: #7c3aed;
    padding: 14px 32px;
    border-radius: 100px;
    font-weight: 700;
    font-size: 1.05rem;
    text-decoration: none;
    transition: all .3s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .afdian-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,0,0,0.2);
    color: #6d28d9;
  }
  /* Footer */
  footer {
    border-top: 1px solid var(--border);
    padding: 40px 24px;
    text-align: center;
    color: var(--text2);
    font-size: .85rem;
  }
  footer a { color: var(--accent2); text-decoration: none; }
  /* Mobile */
  @media (max-width: 768px) {
    .nav-links { display: none; }
    .hero h1 { font-size: 2rem; }
    section { padding: 60px 16px; }
    .download-card { padding: 28px; }
  }
  /* Lang visibility controlled by JS */
  .lang-hidden { display: none !important; }
</style>
</head>
<body data-lang="en">

<!-- Navigation -->
<nav class="nav">
  <a href="#" class="nav-logo"><span class="logo-icon">B</span>basic OS</a>
  <div class="nav-links">
    <a href="#features" lang="en">Features</a>
    <a href="#features" lang="zh-CN">特性</a>
    <a href="#features" lang="zh-TW">特性</a>
    <a href="#specs" lang="en">Specs</a>
    <a href="#specs" lang="zh-CN">规格</a>
    <a href="#specs" lang="zh-TW">規格</a>
    <a href="#sponsor" lang="en">Sponsor</a>
    <a href="#sponsor" lang="zh-CN">赞助</a>
    <a href="#sponsor" lang="zh-TW">贊助</a>
    <a href="#download" class="download-btn" lang="en">Download</a>
    <a href="#download" class="download-btn" lang="zh-CN">下载</a>
    <a href="#download" class="download-btn" lang="zh-TW">下載</a>
    <div class="lang-switch">
      <button onclick="setLang('en')" class="active" id="btn-en">EN</button>
      <button onclick="setLang('zh-CN')" id="btn-zh-CN">简中</button>
      <button onclick="setLang('zh-TW')" id="btn-zh-TW">繁中</button>
    </div>
  </div>
</nav>

<!-- Hero -->
<section class="hero">
  <div class="hero-badge">
    <span class="dot"></span>
    <span lang="en">Linux Kernel 7.1.6 — Stable &amp; Beta Available</span>
    <span lang="zh-CN">Linux 内核 7.1.6 — 正式版 &amp; 内测版</span>
    <span lang="zh-TW">Linux 核心 7.1.6 — 正式版 &amp; 內測版</span>
  </div>
  <h1>basic OS</h1>
  <p lang="en">A minimal, fast, and beautiful Linux operating system. Built from scratch with framebuffer desktop, graphical installer, and app center. Beta version available with activation code.</p>
  <p lang="zh-CN">一个极简、快速、美观的 Linux 操作系统。从零构建，内置 framebuffer 桌面、图形化安装程序和应用中心。内测版支持激活码机制。</p>
  <p lang="zh-TW">一個極簡、快速、美觀的 Linux 作業系統。從零構建，內建 framebuffer 桌面、圖形化安裝程式和應用中心。內測版支援啟用碼機制。</p>
  <div class="hero-buttons">
    <a href="#download" class="btn btn-primary" lang="en">Download ISO</a>
    <a href="#download" class="btn btn-primary" lang="zh-CN">下载 ISO</a>
    <a href="#download" class="btn btn-primary" lang="zh-TW">下載 ISO</a>
    <a href="https://github.com/HuHuBasic/Basic-OS" class="btn btn-outline" target="_blank">GitHub</a>
  </div>
</section>

<!-- Features -->
<section id="features">
  <div class="section-title">
    <h2 lang="en">Why basic OS?</h2>
    <h2 lang="zh-CN">为什么选择 basic OS？</h2>
    <h2 lang="zh-TW">為什麼選擇 basic OS？</h2>
    <p lang="en">Designed for simplicity, speed, and hackability</p>
    <p lang="zh-CN">为简洁、速度和可定制性而生</p>
    <p lang="zh-TW">為簡潔、速度和可訂製性而生</p>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon">🖥️</div>
      <h3 lang="en">Framebuffer Desktop</h3>
      <h3 lang="zh-CN">Framebuffer 桌面</h3>
      <h3 lang="zh-TW">Framebuffer 桌面</h3>
      <p lang="en">Pure C framebuffer desktop — no X11, no Wayland. Just raw pixel access for lightning-fast rendering.</p>
      <p lang="zh-CN">纯 C 语言 framebuffer 桌面 — 无需 X11、无需 Wayland。直接写屏，极速渲染。</p>
      <p lang="zh-TW">純 C 語言 framebuffer 桌面 — 無需 X11、無需 Wayland。直接寫屏，極速渲染。</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📦</div>
      <h3 lang="en">App Center</h3>
      <h3 lang="zh-CN">应用中心</h3>
      <h3 lang="zh-TW">應用中心</h3>
      <p lang="en">Graphical TUI app center with one-click install, search, and update. Browse and install apps with ease.</p>
      <p lang="zh-CN">图形化 TUI 应用中心，一键安装、搜索和更新。轻松浏览和安装应用。</p>
      <p lang="zh-TW">圖形化 TUI 應用中心，一鍵安裝、搜尋和更新。輕鬆瀏覽和安裝應用。</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💿</div>
      <h3 lang="en">Graphical Installer</h3>
      <h3 lang="zh-CN">图形化安装程序</h3>
      <h3 lang="zh-TW">圖形化安裝程式</h3>
      <p lang="en">Install to your hard disk with a user-friendly dialog-based installer. Select disk, confirm, done.</p>
      <p lang="zh-CN">使用友好的 dialog 图形安装程序安装到硬盘。选择磁盘、确认、完成。</p>
      <p lang="zh-TW">使用友善的 dialog 圖形安裝程式安裝到硬碟。選擇磁碟、確認、完成。</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">⚡</div>
      <h3 lang="en">Ultra Lightweight</h3>
      <h3 lang="zh-CN">超轻量级</h3>
      <h3 lang="zh-TW">超輕量級</h3>
      <p lang="en">Only 14MB ISO. Statically linked BusyBox — zero external dependencies. Boots in seconds.</p>
      <p lang="zh-CN">仅 14MB ISO。BusyBox 静态编译 — 零外部依赖。秒级启动。</p>
      <p lang="zh-TW">僅 14MB ISO。BusyBox 靜態編譯 — 零外部依賴。秒級啟動。</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🌐</div>
      <h3 lang="en">Multi-Language</h3>
      <h3 lang="zh-CN">多语言支持</h3>
      <h3 lang="zh-TW">多語言支援</h3>
      <p lang="en">Full i18n support for English, Simplified Chinese, and Traditional Chinese. All system tools localized.</p>
      <p lang="zh-CN">完整的 i18n 支持：英文、简体中文、繁体中文。所有系统工具均已本地化。</p>
      <p lang="zh-TW">完整的 i18n 支援：英文、簡體中文、繁體中文。所有系統工具均已本地化。</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔄</div>
      <h3 lang="en">Update System</h3>
      <h3 lang="zh-CN">更新系统</h3>
      <h3 lang="zh-TW">更新系統</h3>
      <p lang="en">Delta update packages. Download only what changed. Simple one-command system upgrades.</p>
      <p lang="zh-CN">增量更新包机制。只下载变更部分。一条命令完成系统升级。</p>
      <p lang="zh-TW">增量更新包機制。只下載變更部分。一條命令完成系統升級。</p>
    </div>
  </div>
</section>

<!-- Specs -->
<section id="specs">
  <div class="section-title">
    <h2 lang="en">Technical Specifications</h2>
    <h2 lang="zh-CN">技术规格</h2>
    <h2 lang="zh-TW">技術規格</h2>
  </div>
  <div class="specs">
    <div class="spec-grid">
      <div class="spec-item">
        <div class="label" lang="en">Kernel</div>
        <div class="label" lang="zh-CN">内核</div>
        <div class="label" lang="zh-TW">核心</div>
        <div class="value">Linux 7.1.6</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">User Space</div>
        <div class="label" lang="zh-CN">用户空间</div>
        <div class="label" lang="zh-TW">使用者空間</div>
        <div class="value">BusyBox 1.36.1</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">Architecture</div>
        <div class="label" lang="zh-CN">架构</div>
        <div class="label" lang="zh-TW">架構</div>
        <div class="value">x86_64</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">ISO Size</div>
        <div class="label" lang="zh-CN">ISO 大小</div>
        <div class="label" lang="zh-TW">ISO 大小</div>
        <div class="value">~14 MB</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">Desktop</div>
        <div class="label" lang="zh-CN">桌面</div>
        <div class="label" lang="zh-TW">桌面</div>
        <div class="value">Framebuffer</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">Languages</div>
        <div class="label" lang="zh-CN">语言</div>
        <div class="label" lang="zh-TW">語言</div>
        <div class="value">EN, 简体中文, 繁體中文</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">Bootloader</div>
        <div class="label" lang="zh-CN">引导程序</div>
        <div class="label" lang="zh-TW">引導程式</div>
        <div class="value">ISOLINUX</div>
      </div>
      <div class="spec-item">
        <div class="label" lang="en">Filesystems</div>
        <div class="label" lang="zh-CN">文件系统</div>
        <div class="label" lang="zh-TW">檔案系統</div>
        <div class="value">ext4, vfat, exfat, iso9660, overlay, tmpfs</div>
      </div>
    </div>
  </div>
</section>

<!-- Download -->
<section id="download">
  <div class="section-title">
    <h2 lang="en">Download basic OS</h2>
    <h2 lang="zh-CN">下载 basic OS</h2>
    <h2 lang="zh-TW">下載 basic OS</h2>
    <p lang="en">Choose between stable release and internal testing beta</p>
    <p lang="zh-CN">选择正式版或内测版</p>
    <p lang="zh-TW">選擇正式版或內測版</p>
  </div>
  <div class="download-grid">
    <!-- Stable -->
    <div class="download-card">
      <span class="edition-badge stable-badge" lang="en">STABLE</span>
      <span class="edition-badge stable-badge" lang="zh-CN">正式版</span>
      <span class="edition-badge stable-badge" lang="zh-TW">正式版</span>
      <h3>basic OS</h3>
      <div class="edition-subtitle" lang="en">Public Release</div>
      <div class="edition-subtitle" lang="zh-CN">公开发布版</div>
      <div class="edition-subtitle" lang="zh-TW">公開發布版</div>
      <div class="file-info">
        <span lang="en">Version 1.0.0</span>
        <span lang="zh-CN">版本 1.0.0</span>
        <span lang="zh-TW">版本 1.0.0</span>
        &middot;
        <span>~14 MB</span>
        &middot;
        <span>x86_64</span>
      </div>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-stable.iso" class="btn btn-primary" style="margin-top:12px;" lang="en">Download Stable</a>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-stable.iso" class="btn btn-primary" style="margin-top:12px;" lang="zh-CN">下载正式版</a>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-stable.iso" class="btn btn-primary" style="margin-top:12px;" lang="zh-TW">下載正式版</a>
      <br>
      <a href="https://github.com/HuHuBasic/Basic-OS" class="btn btn-outline" target="_blank" style="margin-top:8px;font-size:.85rem;" lang="en">View on GitHub</a>
      <a href="https://github.com/HuHuBasic/Basic-OS" class="btn btn-outline" target="_blank" style="margin-top:8px;font-size:.85rem;" lang="zh-CN">在 GitHub 上查看</a>
      <a href="https://github.com/HuHuBasic/Basic-OS" class="btn btn-outline" target="_blank" style="margin-top:8px;font-size:.85rem;" lang="zh-TW">在 GitHub 上檢視</a>
    </div>

    <!-- Beta -->
    <div class="download-card beta">
      <span class="edition-badge beta-badge" lang="en">BETA</span>
      <span class="edition-badge beta-badge" lang="zh-CN">内测版</span>
      <span class="edition-badge beta-badge" lang="zh-TW">內測版</span>
      <h3>basic OS</h3>
      <div class="edition-subtitle" lang="en">Internal Testing</div>
      <div class="edition-subtitle" lang="zh-CN">内部测试版</div>
      <div class="edition-subtitle" lang="zh-TW">內部測試版</div>
      <div class="file-info">
        <span lang="en">Version 1.0.0-beta</span>
        <span lang="zh-CN">版本 1.0.0-beta</span>
        <span lang="zh-TW">版本 1.0.0-beta</span>
        &middot;
        <span>~14 MB</span>
        &middot;
        <span>x86_64</span>
      </div>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-beta.iso" class="btn btn-outline" style="margin-top:12px;border-color:#a855f7;color:#a855f7;" lang="en">Download Beta</a>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-beta.iso" class="btn btn-outline" style="margin-top:12px;border-color:#a855f7;color:#a855f7;" lang="zh-CN">下载内测版</a>
      <a href="https://github.com/HuHuBasic/Basic-OS/releases/latest/download/basic-os-beta.iso" class="btn btn-outline" style="margin-top:12px;border-color:#a855f7;color:#a855f7;" lang="zh-TW">下載內測版</a>
      <div class="activation-info">
        <p lang="en"><strong>Activation required.</strong> The beta version needs an activation code to boot. Support us on Afdian to get one.</p>
        <p lang="zh-CN"><strong>需要激活码。</strong>内测版启动需要激活码。在爱发电支持我们即可获取。</p>
        <p lang="zh-TW"><strong>需要啟用碼。</strong>內測版啟動需要啟用碼。在愛發電支持我們即可獲取。</p>
      </div>
    </div>
  </div>
</section>

<!-- Sponsor -->
<section id="sponsor">
  <div class="section-title">
    <h2 lang="en">Support this Project</h2>
    <h2 lang="zh-CN">支持这个项目</h2>
    <h2 lang="zh-TW">支持這個專案</h2>
    <p lang="en">If you find basic OS useful, consider supporting its development on Afdian.</p>
    <p lang="zh-CN">如果你觉得 basic OS 有用，可以在爱发电上支持它的开发。</p>
    <p lang="zh-TW">如果你覺得 basic OS 有用，可以在愛發電上支持它的開發。</p>
  </div>
  <div class="sponsor-card">
    <div class="sponsor-icon">
      <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
        <ellipse cx="32" cy="30" rx="28" ry="22" fill="#fff" opacity="0.15"/>
        <circle cx="32" cy="18" r="4" fill="#fff"/>
        <path d="M14 44 Q32 48 50 44" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="22" cy="34" r="1.5" fill="#fff" opacity="0.6"/>
        <circle cx="42" cy="34" r="1.5" fill="#fff" opacity="0.6"/>
      </svg>
    </div>
    <p lang="en" class="sponsor-text">Support basic OS development</p>
    <p lang="zh-CN" class="sponsor-text">支持 basic OS 的开发</p>
    <p lang="zh-TW" class="sponsor-text">支持 basic OS 的開發</p>
    <a href="https://www.ifdian.net/a/Basic" target="_blank" class="afdian-btn">
      <svg viewBox="0 0 64 64" width="22" height="22" fill="none">
        <ellipse cx="32" cy="30" rx="26" ry="20" fill="#fff"/>
        <circle cx="32" cy="18" r="4" fill="#946ce6"/>
        <path d="M14 42 Q32 46 50 42" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="22" cy="34" r="1.5" fill="#fff" opacity="0.6"/>
        <circle cx="42" cy="34" r="1.5" fill="#fff" opacity="0.6"/>
      </svg>
      <span lang="en">Support me on Afdian</span>
      <span lang="zh-CN">在爱发电支持我</span>
      <span lang="zh-TW">在愛發電支持我</span>
    </a>
  </div>
</section>

<!-- Quick Start -->
<section>
  <div class="section-title">
    <h2 lang="en">Quick Start</h2>
    <h2 lang="zh-CN">快速开始</h2>
    <h2 lang="zh-TW">快速開始</h2>
  </div>
  <div class="specs">
    <h3 lang="en">Run in QEMU</h3>
    <h3 lang="zh-CN">在 QEMU 中运行</h3>
    <h3 lang="zh-TW">在 QEMU 中執行</h3>
    <pre style="background:var(--bg3);color:var(--text);padding:20px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:.9rem;"># <span lang="en">Desktop mode (Live)</span><span lang="zh-CN">桌面模式 (Live)</span><span lang="zh-TW">桌面模式 (Live)</span>
qemu-system-x86_64 -cdrom basic-os.iso -m 512M

# <span lang="en">Text mode</span><span lang="zh-CN">文本模式</span><span lang="zh-TW">文字模式</span>
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 text quiet"

# <span lang="en">Installer mode</span><span lang="zh-CN">安装模式</span><span lang="zh-TW">安裝模式</span>
qemu-system-x86_64 -kernel vmlinuz-basic -initrd initramfs.cpio.gz -append "console=tty0 installer quiet"</pre>
  </div>
</section>

<!-- Footer -->
<footer>
  <p>basic OS &copy; 2025. <span lang="en">Built with passion for minimal computing.</span><span lang="zh-CN">为极简计算而生。</span><span lang="zh-TW">為極簡計算而生。</span></p>
  <p style="margin-top:8px;">
    <a href="https://github.com/HuHuBasic/Basic-OS" target="_blank">GitHub</a>
    &middot;
    <a href="https://gitee.com/basic-game/basic-os" target="_blank">Gitee</a>
    &middot;
    <a href="https://www.ifdian.net/a/Basic" target="_blank">爱发电</a>
  </p>
</footer>

<script>
(function() {
  var currentLang = 'en';
  window.setLang = function(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    document.body.setAttribute('data-lang', lang);
    document.querySelectorAll('[lang]').forEach(function(el) {
      if (el.getAttribute('lang') === lang) {
        el.classList.remove('lang-hidden');
      } else {
        el.classList.add('lang-hidden');
      }
    });
    document.querySelectorAll('.lang-switch button').forEach(function(b) {
      b.classList.remove('active');
    });
    var btn = document.getElementById('btn-' + lang);
    if (btn) btn.classList.add('active');
    try { localStorage.setItem('basic-os-lang', lang); } catch(e) {}
  };
  // Init: hide non-current lang on page load
  var saved = 'en';
  try { saved = localStorage.getItem('basic-os-lang') || 'en'; } catch(e) {}
  setLang(saved);
})();
</script>
</body>
</html>
`;

// Cloudflare Worker for Basic-OS VM
// Proxies v86 resources from copy.sh and serves VM page with COOP/COEP headers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main';

// Multiboot header patching - kernel.bin is missing required Multiboot header
// Dynamically find kernel.bin by parsing the ISO 9660 filesystem
// Offset 180 = after ELF header (52) + 4 program headers (4*32=128) = safe zero-filled area
// Flags=0x03: page-align (bit0) + memory info (bit1) = TEXT MODE
// v86's VGA BIOS does not support VBE graphics modes properly
const MULTIBOOT_HEADER_OFFSET = 180;
const MULTIBOOT_MAGIC = 0x1BADB002;
const MULTIBOOT_FLAGS = 0x00000003; // page-align + memory info (text mode)
const MULTIBOOT_CHECKSUM = 0xE4524FFB; // -(MAGIC + FLAGS) & 0xFFFFFFFF
const VIDEO_MODE_TYPE = 0; // 0 = linear graphics
const VIDEO_WIDTH = 800;
const VIDEO_HEIGHT = 600;
const VIDEO_DEPTH = 32;

function findKernelInISO(buffer, kernelNames) {
  // Parse ISO 9660 Primary Volume Descriptor at sector 16 (0x8000)
  if (buffer.byteLength < 0x8800) return null;
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // PVD starts at 0x8000, root directory entry at offset 156
  const rootLBA = view.getUint32(0x8000 + 156 + 2, true);
  const rootSize = view.getUint32(0x8000 + 156 + 10, true);

  const MAX_DEPTH = 10;
  const MAX_ENTRIES = 1000;
  let entriesScanned = 0;
  const names = kernelNames || ['kernel.bin'];

  function parseDir(lba, size, depth) {
    if (depth > MAX_DEPTH) return null;
    let off = lba * 2048;
    const end = Math.min(off + size, buffer.byteLength);
    while (off < end && entriesScanned < MAX_ENTRIES) {
      const entryLen = data[off];
      if (entryLen === 0 || entryLen < 34) break;
      const nameLen = data[off + 32];
      if (nameLen > 0 && nameLen < 64) {
        const name = new TextDecoder().decode(data.subarray(off + 33, off + 33 + nameLen))
          .split(';')[0].replace(/\.$/, '');
        const flags = data[off + 25];
        const entryLBA = view.getUint32(off + 2, true);
        const entrySize = view.getUint32(off + 10, true);
        entriesScanned++;
        for (const kn of names) {
          if (name === kn || name.toLowerCase() === kn.toLowerCase()) {
            return { offset: entryLBA * 2048, name: kn };
          }
        }
        if (name !== '.' && name !== '..' && (flags & 2) && entryLBA > 0 && entrySize > 0) {
          const result = parseDir(entryLBA, entrySize, depth + 1);
          if (result !== null) return result;
        }
      }
      off += entryLen;
    }
    return null;
  }

  return parseDir(rootLBA, rootSize, 0);
}

function patchKernel(buffer, kernelName) {
  const kn = kernelName || 'kernel.bin';
  let kernelNames;
  if (kn === 'kernel32.bin') {
    kernelNames = ['kernel32.bin'];
  } else if (kn === 'kernel64.bin') {
    kernelNames = ['kernel64.bin'];
  } else {
    kernelNames = ['kernel.bin'];
  }
  const result = findKernelInISO(buffer, kernelNames);
  if (result === null) {
    console.log('patchKernel: ' + kn + ' not found in ISO');
    return buffer;
  }
  const kernelOffset = result.offset;

  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Verify ELF magic at kernel start
  const elfClass = data[kernelOffset + 4]; // 1=32-bit, 2=64-bit
  if (data[kernelOffset] !== 0x7F ||
      data[kernelOffset + 1] !== 0x45 ||
      data[kernelOffset + 2] !== 0x4C ||
      data[kernelOffset + 3] !== 0x46) {
    console.log('patchKernel: ' + kn + ' at offset ' + kernelOffset + ' is not ELF');
    return buffer;
  }
  console.log('patchKernel: ' + kn + ' is ELF' + (elfClass === 1 ? '32' : '64') + ' at offset ' + kernelOffset);

  // Fix corrupted program header [0] if a previous bad patch wrote Multiboot
  const ph0_type_offset = kernelOffset + (elfClass === 1 ? 52 : 64); // ELF header size
  if (view.getUint32(ph0_type_offset, true) === MULTIBOOT_MAGIC) {
    view.setUint32(ph0_type_offset, 1, true);
    view.setUint32(ph0_type_offset + 4, 0x1000, true);
    view.setUint32(ph0_type_offset + 8, 0, true);
    view.setUint32(ph0_type_offset + 12, 0, true);
    console.log('patchKernel: restored corrupted program header [0]');
  }

  // === Patch 1: Multiboot header (only for 32-bit kernels) ===
  // ELF64 kernels use Multiboot 2 - do NOT write Multiboot 1 header
  if (elfClass === 1) {
    const mbOffset = kernelOffset + MULTIBOOT_HEADER_OFFSET;
    const currentFlags = view.getUint32(mbOffset + 4, true);
    if (view.getUint32(mbOffset, true) !== MULTIBOOT_MAGIC ||
        currentFlags !== MULTIBOOT_FLAGS) {
      view.setUint32(mbOffset + 0, MULTIBOOT_MAGIC, true);
      view.setUint32(mbOffset + 4, MULTIBOOT_FLAGS, true);
      view.setUint32(mbOffset + 8, MULTIBOOT_CHECKSUM, true);
      view.setUint32(mbOffset + 12, 0, true);  // header_addr
      view.setUint32(mbOffset + 16, 0, true);  // load_addr
      view.setUint32(mbOffset + 20, 0, true);  // load_end_addr
      view.setUint32(mbOffset + 24, 0, true);  // bss_end_addr
      view.setUint32(mbOffset + 28, 0, true);  // entry_addr
      view.setUint32(mbOffset + 32, VIDEO_MODE_TYPE, true);
      view.setUint32(mbOffset + 36, VIDEO_WIDTH, true);
      view.setUint32(mbOffset + 40, VIDEO_HEIGHT, true);
      view.setUint32(mbOffset + 44, VIDEO_DEPTH, true);
      console.log('patchKernel: Multiboot header patched (text mode)');
    }
  } else {
    console.log('patchKernel: skipping Multiboot 1 header for ELF64 kernel');
  }

  // === Patch 2: Fix PIC IMR to unmask IRQ2(cascade) + IRQ12(mouse) ===
  // Try primary pattern (32-bit kernel): B0 FC E6 21 B0 FF E6 A1
  //   mov al, 0xFC; out 0x21, al; mov al, 0xFF; out 0xA1, al
  // Fallback pattern (64-bit kernel): B8 FF FF FF FF E6 21 E6 A1
  //   mov eax, 0xFFFFFFFF; out 0x21, al; out 0xA1, al
  // Change to: B0 F8 E6 21 B0 EF E6 A1 (or B0 F8 90 90 90 E6 21 B0 EF E6 A1 90 for 64-bit)
  // Master IMR: 0xF8 = unmask IRQ0+IRQ1+IRQ2  Slave IMR: 0xEF = unmask IRQ12
  let patched = false;
  const PIC_PATCH_OFFSET = 0x8216;
  const picPatchOffset = kernelOffset + PIC_PATCH_OFFSET;
  if (data[picPatchOffset] === 0xB0 && data[picPatchOffset + 1] === 0xFC &&
      data[picPatchOffset + 2] === 0xE6 && data[picPatchOffset + 3] === 0x21 &&
      data[picPatchOffset + 4] === 0xB0 && data[picPatchOffset + 5] === 0xFF &&
      data[picPatchOffset + 6] === 0xE6 && data[picPatchOffset + 7] === 0xA1) {
    data[picPatchOffset + 1] = 0xF8; // 0xFC → 0xF8 (unmask IRQ2 cascade)
    data[picPatchOffset + 5] = 0xEF; // 0xFF → 0xEF (unmask IRQ12 mouse)
    console.log('patchKernel: PIC IMR patched (32-bit pattern) - IRQ0+1+2+12 unmasked');
    patched = true;
  }
  // Fallback: search for 64-bit pattern in the kernel binary
   if (!patched) {
     const searchEnd = kernelOffset + 0x20000;
     for (let i = kernelOffset; i < searchEnd - 9; i++) {
       if (data[i] === 0xB8 && data[i+1] === 0xFF && data[i+2] === 0xFF &&
           data[i+3] === 0xFF && data[i+4] === 0xFF &&
           data[i+5] === 0xE6 && data[i+6] === 0x21 &&
           data[i+7] === 0xE6 && data[i+8] === 0xA1) {
         // Original 9 bytes: B8 FF FF FF FF E6 21 E6 A1
         // New 9 bytes:      B0 F8 E6 21 B0 EF E6 A1 90
         data[i] = 0xB0; data[i+1] = 0xF8; // mov al, 0xF8
         data[i+2] = 0xE6; data[i+3] = 0x21; // out 0x21, al
         data[i+4] = 0xB0; data[i+5] = 0xEF; // mov al, 0xEF
         data[i+6] = 0xE6; data[i+7] = 0xA1; // out 0xA1, al
         data[i+8] = 0x90; // nop
         console.log('patchKernel: PIC IMR patched (64-bit pattern at 0x' + i.toString(16) + ')');
         patched = true;
         break;
       }
     }
   }
  if (!patched) {
    console.log('patchKernel: PIC IMR pattern not matched at 0x' + picPatchOffset.toString(16) +
      ' bytes: ' + Array.from(data.slice(picPatchOffset, picPatchOffset + 8)).map(b => b.toString(16)).join(' '));
  }

  // === Patch 3: Skip bootscreen_show() to avoid VBE hang in v86 ===
  // bootscreen_show() calls VBE which may hang in v86's limited VGA BIOS
  const BOOTSCREEN_PATCH_OFFSET = 0x87b5;
  const bootPatchOffset = kernelOffset + BOOTSCREEN_PATCH_OFFSET;
  if (data[bootPatchOffset] === 0xE8 && data[bootPatchOffset + 1] === 0x96 &&
      data[bootPatchOffset + 2] === 0xBD && data[bootPatchOffset + 3] === 0xFF &&
      data[bootPatchOffset + 4] === 0xFF) {
    data[bootPatchOffset] = 0x90;
    data[bootPatchOffset + 1] = 0x90;
    data[bootPatchOffset + 2] = 0x90;
    data[bootPatchOffset + 3] = 0x90;
    data[bootPatchOffset + 4] = 0x90;
    console.log('patchKernel: bootscreen_show() call NOPped out');
  }

  console.log('patchKernel: all kernel patches applied to ' + kn);
  return buffer;
}

// BPB patching for corrupt Basic-OS ISO files (only for non-GRUB ISOs)
const ISO_BPB_PATCH = {
  // Basic-OS ISOs use GRUB + El Torito booting, not FAT BPB - do NOT patch
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
  const hostname = url.hostname;

  // === 总官网 Basichu.de5.net — 自定义首页 + /chat 代理到后端 ===
  const isMainSite = hostname === 'basichu.de5.net' || hostname === 'www.basichu.de5.net';

  if (isMainSite) {
    // 首页：使用自定义 OS 下载页
    if (path === '/' || path === '/index.html') {
      return new Response(MAIN_SITE_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // /chat 路径：代理到 Suga.run 后端（含 WebSocket 聊天）
    if (path === '/chat' || path.startsWith('/chat/') || path === '/chat.html' ||
        path.startsWith('/icon-') || path === '/manifest.json') {
      const TARGET = 'https://j7zykpagshgo-production-5fbp4s4f.us-central1.suga.run';
      const TARGET_HOST = new URL(TARGET).host;
      const targetUrl = TARGET + path + url.search;
      
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
        const upstreamResp = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
        });
        return upstreamResp;
      }
      
      try {
        const headers = new Headers(request.headers);
        headers.set('Host', TARGET_HOST);
        const upstreamResp = await fetch(targetUrl, {
          method: request.method,
          headers: headers,
          body: request.body,
          redirect: 'follow',
        });
        const respHeaders = new Headers(upstreamResp.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(upstreamResp.body, {
          status: upstreamResp.status,
          headers: respHeaders,
        });
      } catch(e) {
        return new Response('Service temporarily unavailable', { status: 503 });
      }
    }
    
    // 其他路径返回 404
    return new Response('Not Found', { status: 404 });
  }

  // === 以下为 VM 服务 (basicgame.cc.cd / basic.basichu.de5.net 等) ===

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
  // ReactOS ISOs from official daily builds
  if (path === '/iso/reactos-livecd.iso' || path === '/iso/reactos-bootcd.iso') {
    const reactosUrl = path === '/iso/reactos-livecd.iso'
      ? 'https://iso.reactos.org/livecd/latest-x86-gcc-lin-rel'
      : 'https://iso.reactos.org/bootcd/latest-x86-gcc-lin-rel';
    try {
      const resp = await fetch(reactosUrl, { redirect: 'follow' });
      if (!resp.ok) return new Response('ReactOS ISO not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch(e) {
      return new Response('ReactOS proxy error: ' + e.message, { status: 503 });
    }
  }

  // GitHub-based ISO files with Multiboot header patching
  if (path.startsWith('/iso/')) {
    const isoName = path.substring('/iso'.length).split('?')[0]; // Strip query string
    const isoUrl = GITHUB_RAW + isoName;
    try {
      const resp = await fetch(isoUrl);
      if (!resp.ok) return new Response('ISO not found', { status: 404 });
      const patch = ISO_BPB_PATCH[isoName];
      // Kernel patching needed for Basic-OS ISOs (32-bit, 64-bit, 64+32-bit)
      const needsKernelPatch = isoName === "/basic-os-32.iso" ||
                               isoName === "/basic-os-64.iso" ||
                               isoName === "/basic-os-64-32.iso";
      if (patch || needsKernelPatch) {
        const buffer = await resp.arrayBuffer();
        let patched = buffer;
        if (patch) {
          patched = patchBPB(patched, patch.sectors, patch.spf);
          patched = patchBootCatalog(patched);
        }
        if (needsKernelPatch) {
          if (isoName === "/basic-os-64-32.iso") {
            // Patch both 32-bit and 64-bit kernels in the 64+32-bit ISO
            patched = patchKernel(patched, 'kernel32.bin');
            patched = patchKernel(patched, 'kernel64.bin');
          } else {
            patched = patchKernel(patched, 'kernel.bin');
          }
        }
        return new Response(patched, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
            'Cross-Origin-Resource-Policy': 'cross-origin',
          },
        });
      }
      // Stream directly without buffering (for GRUB-based ISOs)
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
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