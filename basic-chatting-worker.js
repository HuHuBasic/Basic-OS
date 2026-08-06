(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // cloudflare-worker.js
  var TARGET = "https://j7zykpagshgo-production-5fbp4s4f.us-central1.suga.run";
  var TARGET_HOST = new URL(TARGET).host;
  var data = {
    accounts: {},
    friends: {},
    friendRequests: {},
    messages: [],
    groups: {},
    groupMessages: {},
    groupInvites: {},
    moments: [],
    avatars: {}
  };
  var clients = /* @__PURE__ */ new Map();
  var onlineUsers = /* @__PURE__ */ new Map();
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return "h" + Math.abs(hash).toString(36);
  }
  __name(simpleHash, "simpleHash");
  function sendJSON(ws, obj) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (e) {
    }
  }
  __name(sendJSON, "sendJSON");
  function broadcastOnlineUsers() {
    const users = [];
    for (const [nameLower, u] of onlineUsers) {
      users.push({ id: u.id, name: u.name, online: true, avatar: u.avatar });
    }
    const msg = JSON.stringify({ type: "online_users", users });
    for (const [nameLower, u] of onlineUsers) {
      try {
        u.ws.send(msg);
      } catch (e) {
      }
    }
  }
  __name(broadcastOnlineUsers, "broadcastOnlineUsers");
  function filterUserGroups(nameLower) {
    const result = {};
    for (const gid in data.groups) {
      if (data.groups[gid].members[nameLower]) result[gid] = data.groups[gid];
    }
    return result;
  }
  __name(filterUserGroups, "filterUserGroups");
  function broadcastMomentUpdate() {
    const msg = JSON.stringify({ type: "moments_updated", moments: data.moments });
    for (const [nameLower, u] of onlineUsers) {
      try {
        u.ws.send(msg);
      } catch (e) {
      }
    }
  }
  __name(broadcastMomentUpdate, "broadcastMomentUpdate");
  function handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    const { type } = msg;
    switch (type) {
      case "register":
        handleRegister(ws, msg);
        break;
      case "login":
        handleLogin(ws, msg);
        break;
      case "heartbeat":
        break;
      case "avatar_update":
        handleAvatarUpdate(ws, msg);
        break;
      case "friend_request":
        handleFriendRequest(ws, msg);
        break;
      case "friend_accept":
        handleFriendAccept(ws, msg);
        break;
      case "friend_reject":
        handleFriendReject(ws, msg);
        break;
      case "friend_removed":
        handleFriendRemove(ws, msg);
        break;
      case "chat":
        handleChat(ws, msg);
        break;
      case "group_create":
        handleGroupCreate(ws, msg);
        break;
      case "group_chat":
        handleGroupChat(ws, msg);
        break;
      case "group_invite":
        handleGroupInvite(ws, msg);
        break;
      case "group_accept":
        handleGroupAccept(ws, msg);
        break;
      case "group_leave":
        handleGroupLeave(ws, msg);
        break;
      case "moment_post":
        handleMomentPost(ws, msg);
        break;
      case "moment_like":
        handleMomentLike(ws, msg);
        break;
      case "moment_comment":
        handleMomentComment(ws, msg);
        break;
      case "change_password":
        handleChangePassword(ws, msg);
        break;
      case "delete_account":
        handleDeleteAccount(ws, msg);
        break;
      case "request_users":
        broadcastOnlineUsers();
        break;
      default:
        break;
    }
  }
  __name(handleMessage, "handleMessage");
  function disconnectClient(ws) {
    const client = clients.get(ws);
    if (!client) return;
    onlineUsers.delete(client.nameLower);
    clients.delete(ws);
    broadcastOnlineUsers();
  }
  __name(disconnectClient, "disconnectClient");
  function handleRegister(ws, msg) {
    const { name, pass } = msg;
    if (!name || !pass) {
      sendJSON(ws, { type: "register_result", ok: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" });
      return;
    }
    const nameLower = name.toLowerCase();
    if (data.accounts[nameLower]) {
      sendJSON(ws, { type: "register_result", ok: false, error: "\u8BE5\u7528\u6237\u540D\u5DF2\u88AB\u6CE8\u518C" });
      return;
    }
    if (name.length < 2) {
      sendJSON(ws, { type: "register_result", ok: false, error: "\u7528\u6237\u540D\u81F3\u5C112\u4E2A\u5B57\u7B26" });
      return;
    }
    if (pass.length < 4) {
      sendJSON(ws, { type: "register_result", ok: false, error: "\u5BC6\u7801\u81F3\u5C114\u4F4D" });
      return;
    }
    data.accounts[nameLower] = { name, pass: simpleHash(pass), createdAt: Date.now() };
    sendJSON(ws, { type: "register_result", ok: true });
  }
  __name(handleRegister, "handleRegister");
  function handleLogin(ws, msg) {
    const { name, pass } = msg;
    if (!name || !pass) {
      sendJSON(ws, { type: "login_result", ok: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" });
      return;
    }
    const nameLower = name.toLowerCase();
    const acct = data.accounts[nameLower];
    if (!acct) {
      sendJSON(ws, { type: "login_result", ok: false, error: "\u7528\u6237\u4E0D\u5B58\u5728" });
      return;
    }
    if (acct.pass !== simpleHash(pass)) {
      sendJSON(ws, { type: "login_result", ok: false, error: "\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    if (onlineUsers.has(nameLower)) {
      sendJSON(ws, { type: "login_result", ok: false, error: "\u8BE5\u8D26\u53F7\u5DF2\u5728\u5176\u4ED6\u8BBE\u5907\u767B\u5F55" });
      return;
    }
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const avatar = data.avatars[nameLower] || null;
    clients.set(ws, { id, name: acct.name, nameLower });
    onlineUsers.set(nameLower, { id, name: acct.name, avatar, ws });
    const userFriends = data.friends[nameLower] || {};
    const userFriendRequests = data.friendRequests[nameLower] || [];
    const userGroups = filterUserGroups(nameLower);
    const userGroupInvites = data.groupInvites[nameLower] || [];
    sendJSON(ws, {
      type: "login_result",
      ok: true,
      id,
      name: acct.name,
      avatar,
      friends: userFriends,
      friendRequests: userFriendRequests,
      groups: userGroups,
      groupInvites: userGroupInvites,
      messages: data.messages,
      groupMessages: data.groupMessages,
      moments: data.moments,
      avatars: data.avatars
    });
    broadcastOnlineUsers();
  }
  __name(handleLogin, "handleLogin");
  function handleChangePassword(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { oldPass, newPass } = msg;
    const acct = data.accounts[client.nameLower];
    if (!acct || acct.pass !== simpleHash(oldPass)) {
      sendJSON(ws, { type: "change_password_result", ok: false, error: "\u5F53\u524D\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    if (newPass.length < 4) {
      sendJSON(ws, { type: "change_password_result", ok: false, error: "\u65B0\u5BC6\u7801\u81F3\u5C114\u4F4D" });
      return;
    }
    acct.pass = simpleHash(newPass);
    sendJSON(ws, { type: "change_password_result", ok: true });
  }
  __name(handleChangePassword, "handleChangePassword");
  function handleDeleteAccount(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { pass } = msg;
    const acct = data.accounts[client.nameLower];
    if (!acct || acct.pass !== simpleHash(pass)) {
      sendJSON(ws, { type: "delete_account_result", ok: false, error: "\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    const nameLower = client.nameLower;
    for (const fl in data.friends) {
      delete data.friends[fl][nameLower];
    }
    for (const gid in data.groups) {
      delete data.groups[gid].members[nameLower];
    }
    delete data.accounts[nameLower];
    delete data.friends[nameLower];
    delete data.friendRequests[nameLower];
    delete data.groupInvites[nameLower];
    delete data.avatars[nameLower];
    onlineUsers.delete(nameLower);
    clients.delete(ws);
    sendJSON(ws, { type: "delete_account_result", ok: true });
    broadcastOnlineUsers();
  }
  __name(handleDeleteAccount, "handleDeleteAccount");
  function handleAvatarUpdate(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    data.avatars[client.nameLower] = msg.avatar || null;
    const user = onlineUsers.get(client.nameLower);
    if (user) user.avatar = msg.avatar;
    broadcastOnlineUsers();
  }
  __name(handleAvatarUpdate, "handleAvatarUpdate");
  function handleFriendRequest(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { targetName } = msg;
    if (!targetName) return;
    const targetLower = targetName.toLowerCase();
    if (targetLower === client.nameLower) {
      sendJSON(ws, { type: "friend_request_result", ok: false, error: "\u4E0D\u80FD\u6DFB\u52A0\u81EA\u5DF1" });
      return;
    }
    if (!data.accounts[targetLower]) {
      sendJSON(ws, { type: "friend_request_result", ok: false, error: "\u7528\u6237\u4E0D\u5B58\u5728" });
      return;
    }
    const myFriends = data.friends[client.nameLower] || {};
    if (myFriends[targetLower]) {
      sendJSON(ws, { type: "friend_request_result", ok: false, error: "\u5DF2\u7ECF\u662F\u597D\u53CB" });
      return;
    }
    if (!data.friendRequests[targetLower]) data.friendRequests[targetLower] = [];
    const existing = data.friendRequests[targetLower].find((r) => r.nameLower === client.nameLower);
    if (existing) {
      sendJSON(ws, { type: "friend_request_result", ok: false, error: "\u5DF2\u53D1\u9001\u8FC7\u8BF7\u6C42" });
      return;
    }
    data.friendRequests[targetLower].push({ id: client.id, name: client.name, nameLower: client.nameLower, ts: Date.now() });
    sendJSON(ws, { type: "friend_request_result", ok: true });
    const target = onlineUsers.get(targetLower);
    if (target) sendJSON(target.ws, { type: "friend_requests_updated", requests: data.friendRequests[targetLower] || [] });
  }
  __name(handleFriendRequest, "handleFriendRequest");
  function handleFriendAccept(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { fromNameLower } = msg;
    if (!fromNameLower) return;
    const reqs = data.friendRequests[client.nameLower] || [];
    const req = reqs.find((r) => r.nameLower === fromNameLower);
    if (!req) return;
    if (!data.friends[client.nameLower]) data.friends[client.nameLower] = {};
    if (!data.friends[fromNameLower]) data.friends[fromNameLower] = {};
    data.friends[client.nameLower][fromNameLower] = { name: req.name, addedAt: Date.now() };
    data.friends[fromNameLower][client.nameLower] = { name: client.name, addedAt: Date.now() };
    data.friendRequests[client.nameLower] = reqs.filter((r) => r.nameLower !== fromNameLower);
    sendJSON(ws, { type: "friends_updated", friends: data.friends[client.nameLower] || {}, friendRequests: data.friendRequests[client.nameLower] || [] });
    const other = onlineUsers.get(fromNameLower);
    if (other) {
      sendJSON(other.ws, { type: "friends_updated", friends: data.friends[fromNameLower] || {}, friendRequests: data.friendRequests[fromNameLower] || [] });
      sendJSON(other.ws, { type: "toast", text: client.name + " \u63A5\u53D7\u4E86\u4F60\u7684\u597D\u53CB\u8BF7\u6C42" });
    }
  }
  __name(handleFriendAccept, "handleFriendAccept");
  function handleFriendReject(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { fromNameLower } = msg;
    if (!fromNameLower) return;
    data.friendRequests[client.nameLower] = (data.friendRequests[client.nameLower] || []).filter((r) => r.nameLower !== fromNameLower);
    sendJSON(ws, { type: "friend_requests_updated", requests: data.friendRequests[client.nameLower] || [] });
  }
  __name(handleFriendReject, "handleFriendReject");
  function handleFriendRemove(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { friendNameLower } = msg;
    if (!friendNameLower) return;
    if (data.friends[client.nameLower]) delete data.friends[client.nameLower][friendNameLower];
    if (data.friends[friendNameLower]) delete data.friends[friendNameLower][client.nameLower];
    sendJSON(ws, { type: "friends_updated", friends: data.friends[client.nameLower] || {}, friendRequests: data.friendRequests[client.nameLower] || [] });
    const other = onlineUsers.get(friendNameLower);
    if (other) sendJSON(other.ws, { type: "friends_updated", friends: data.friends[friendNameLower] || {}, friendRequests: data.friendRequests[friendNameLower] || [] });
  }
  __name(handleFriendRemove, "handleFriendRemove");
  function handleChat(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { toId, text, toNameLower } = msg;
    if (!toId || !text) return;
    const chatMsg = { fromId: client.id, fromName: client.name, toId, text, ts: Date.now() };
    data.messages.push(chatMsg);
    if (data.messages.length > 1e3) data.messages = data.messages.slice(-1e3);
    const target = toNameLower ? onlineUsers.get(toNameLower) : null;
    if (target) sendJSON(target.ws, { type: "chat", fromId: client.id, fromName: client.name, text, ts: chatMsg.ts });
    sendJSON(ws, { type: "chat_sent", msg: chatMsg });
  }
  __name(handleChat, "handleChat");
  function handleGroupCreate(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { name, memberIds } = msg;
    if (!name || !memberIds || memberIds.length === 0) {
      sendJSON(ws, { type: "group_create_result", ok: false, error: "\u53C2\u6570\u4E0D\u5B8C\u6574" });
      return;
    }
    const groupId = "g_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const members = {};
    members[client.nameLower] = { id: client.id, name: client.name, role: "owner" };
    data.groups[groupId] = { name, ownerId: client.id, ownerName: client.name, members, createdAt: Date.now() };
    data.groupMessages[groupId] = [];
    for (const fl of memberIds) {
      if (!data.groupInvites[fl]) data.groupInvites[fl] = [];
      data.groupInvites[fl].push({ groupId, groupName: name, fromId: client.id, fromName: client.name, ts: Date.now() });
      const target = onlineUsers.get(fl);
      if (target) sendJSON(target.ws, { type: "group_invites_updated", groupInvites: data.groupInvites[fl] || [] });
    }
    sendJSON(ws, { type: "group_create_result", ok: true, groupId, group: { name, ownerId: client.id, members, createdAt: Date.now() } });
  }
  __name(handleGroupCreate, "handleGroupCreate");
  function handleGroupChat(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { groupId, text } = msg;
    if (!groupId || !text) return;
    const group = data.groups[groupId];
    if (!group || !group.members[client.nameLower]) return;
    const chatMsg = { fromId: client.id, fromName: client.name, text, ts: Date.now() };
    if (!data.groupMessages[groupId]) data.groupMessages[groupId] = [];
    data.groupMessages[groupId].push(chatMsg);
    if (data.groupMessages[groupId].length > 500) data.groupMessages[groupId] = data.groupMessages[groupId].slice(-500);
    for (const ml in group.members) {
      const target = onlineUsers.get(ml);
      if (target && ml !== client.nameLower) sendJSON(target.ws, { type: "group_chat", groupId, fromId: client.id, fromName: client.name, text, ts: chatMsg.ts });
    }
    sendJSON(ws, { type: "group_chat_sent", groupId, msg: chatMsg });
  }
  __name(handleGroupChat, "handleGroupChat");
  function handleGroupInvite(ws, msg) {
  }
  __name(handleGroupInvite, "handleGroupInvite");
  function handleGroupAccept(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { groupId } = msg;
    if (!groupId) return;
    const invites = data.groupInvites[client.nameLower] || [];
    const inv = invites.find((i) => i.groupId === groupId);
    if (!inv) return;
    const group = data.groups[groupId];
    if (!group) return;
    group.members[client.nameLower] = { id: client.id, name: client.name, role: "member" };
    data.groupInvites[client.nameLower] = invites.filter((i) => i.groupId !== groupId);
    sendJSON(ws, { type: "groups_updated", groups: filterUserGroups(client.nameLower), groupInvites: data.groupInvites[client.nameLower] || [] });
    for (const ml in group.members) {
      const target = onlineUsers.get(ml);
      if (target && ml !== client.nameLower) sendJSON(target.ws, { type: "groups_updated", groups: filterUserGroups(ml), groupInvites: data.groupInvites[ml] || [] });
    }
  }
  __name(handleGroupAccept, "handleGroupAccept");
  function handleGroupLeave(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { groupId } = msg;
    if (!groupId) return;
    const group = data.groups[groupId];
    if (!group || !group.members[client.nameLower]) return;
    delete group.members[client.nameLower];
    if (Object.keys(group.members).length === 0) {
      delete data.groups[groupId];
      delete data.groupMessages[groupId];
    }
    sendJSON(ws, { type: "groups_updated", groups: filterUserGroups(client.nameLower), groupInvites: data.groupInvites[client.nameLower] || [] });
    for (const ml in group.members) {
      const target = onlineUsers.get(ml);
      if (target) sendJSON(target.ws, { type: "groups_updated", groups: filterUserGroups(ml), groupInvites: data.groupInvites[ml] || [] });
    }
  }
  __name(handleGroupLeave, "handleGroupLeave");
  function handleMomentPost(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { text, image } = msg;
    if (!text && !image) return;
    const moment = {
      id: "m_" + Date.now().toString(36),
      authorId: client.id,
      authorName: client.name,
      authorNameLower: client.nameLower,
      authorAvatar: data.avatars[client.nameLower] || null,
      text: text || "",
      image: image || null,
      ts: Date.now(),
      likes: [],
      comments: []
    };
    data.moments.push(moment);
    if (data.moments.length > 200) data.moments = data.moments.slice(-200);
    broadcastMomentUpdate();
    sendJSON(ws, { type: "moment_posted", moment });
  }
  __name(handleMomentPost, "handleMomentPost");
  function handleMomentLike(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { momentId } = msg;
    if (!momentId) return;
    const moment = data.moments.find((m) => m.id === momentId);
    if (!moment) return;
    const idx = moment.likes.indexOf(client.nameLower);
    if (idx >= 0) moment.likes.splice(idx, 1);
    else moment.likes.push(client.nameLower);
    broadcastMomentUpdate();
  }
  __name(handleMomentLike, "handleMomentLike");
  function handleMomentComment(ws, msg) {
    const client = clients.get(ws);
    if (!client) return;
    const { momentId, text } = msg;
    if (!momentId || !text) return;
    const moment = data.moments.find((m) => m.id === momentId);
    if (!moment) return;
    moment.comments.push({ authorName: client.name, authorNameLower: client.nameLower, text, ts: Date.now() });
    broadcastMomentUpdate();
  }
  __name(handleMomentComment, "handleMomentComment");
  var CHAT_HTML = `<!-- Generated by Trae Work -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#6c5ce7">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Basic">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<title>Basic Chatting</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0f172a;--bg2:#1e293b;--sidebar:#0f172a;--chat:#f1f5f9;
  --ink:#1e293b;--muted:#64748b;--rule:#e2e8f0;
  --accent:#3b82f6;--accent2:#2563eb;--online:#22c55e;--offline:#94a3b8;
  --msg-me:#3b82f6;--msg-other:#fff;--msg-me-text:#fff;--msg-other-text:#1e293b;
  --danger:#ef4444;--warn:#f59e0b;--radius:12px;--radius-sm:8px;
  --shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06);
  --shadow-lg:0 10px 25px rgba(0,0,0,.12);
  --font:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  --transition:0.2s cubic-bezier(.4,0,.2,1);
}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font);font-size:15px;line-height:1.5;color:var(--ink);background:var(--bg);-webkit-tap-highlight-color:transparent;-webkit-font-smoothing:antialiased;touch-action:manipulation;}

/* ===== Auth ===== */
.auth-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:var(--bg);}
.auth-card{background:var(--bg2);border-radius:16px;padding:28px 24px;width:94%;max-width:680px;text-align:center;box-shadow:var(--shadow-lg);overflow-y:auto;max-height:90vh;}
.auth-card .logo{width:56px;height:56px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:24px;color:#fff;}
.auth-card h1{font-size:22px;font-weight:700;color:#fff;margin-bottom:2px;}
.auth-card .subtitle{font-size:12px;color:var(--muted);margin-bottom:20px;}
.auth-columns{display:flex;gap:0;align-items:stretch;}
.auth-col{flex:1;padding:0 16px;}
.auth-col h2{font-size:15px;font-weight:700;color:#cbd5e1;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #334155;}
.auth-col label{display:block;text-align:left;font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:4px;margin-top:10px;}
.auth-col label:first-of-type{margin-top:0}
.auth-col input{width:100%;padding:10px 14px;border:2px solid #334155;border-radius:var(--radius-sm);font-size:15px;font-family:var(--font);background:#0f172a;color:#fff;outline:none;transition:var(--transition);}
.auth-col input:focus{border-color:var(--accent)}
.auth-col button{padding:12px;width:100%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:var(--radius-sm);font-size:15px;font-weight:600;font-family:var(--font);cursor:pointer;transition:var(--transition);-webkit-tap-highlight-color:transparent;margin-top:10px;}
.auth-col button:active{transform:scale(.97);opacity:.9}
.remember-row{display:flex;align-items:center;gap:8px;margin-top:10px;text-align:left}
.remember-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer;margin:0}
.remember-row label{color:var(--muted);font-size:13px;cursor:pointer;margin:0!important;user-select:none}
.remember-row label:hover{color:#cbd5e1}
.auth-divider{display:flex;align-items:center;justify-content:center;flex:0 0 40px;position:relative;}
.auth-divider::before{content:'';position:absolute;top:30px;bottom:30px;width:1px;background:#334155;left:50%;transform:translateX(-50%);}
.auth-divider span{background:var(--bg2);color:var(--muted);font-size:12px;font-weight:600;padding:4px 8px;z-index:1;}
.auth-card .error-msg{font-size:12px;color:var(--danger);margin-top:6px;min-height:18px;text-align:left;}
.auth-card .switch-link{display:none;}
@media(max-width:640px){
  .auth-columns{flex-direction:column;}
  .auth-divider{flex:0 0 auto;padding:8px 0;}
  .auth-divider::before{top:auto;bottom:auto;left:20px;right:20px;width:auto;height:1px;transform:none;}
  .auth-col{padding:0 4px 12px;}
  .auth-col:last-child{padding-bottom:0;}
  .auth-card{max-width:400px;padding:24px 20px;}
  .auth-card .logo{width:48px;height:48px;font-size:20px;margin-bottom:8px;}
  .auth-card h1{font-size:20px;}
}

/* ===== Main App ===== */
.app{display:flex;height:100vh;height:100dvh;max-width:1200px;margin:0 auto;background:var(--bg2);overflow:hidden;}
.app.hidden{display:none}

/* ===== Sidebar ===== */
.sidebar{width:320px;min-width:320px;background:var(--sidebar);display:flex;flex-direction:column;border-right:1px solid #1e293b;transition:transform var(--transition);}
.sidebar-header{padding:14px 16px;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:10px;}
.sidebar-header .my-avatar{width:36px;height:36px;min-width:36px;border-radius:50%;cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.sidebar-header .my-avatar img{width:100%;height:100%;object-fit:cover;}
.sidebar-header .my-avatar:hover{opacity:.85}
.sidebar-header h2{font-size:17px;font-weight:700;color:#fff;flex:1;}
.sidebar-header .my-name{font-size:12px;color:var(--accent);background:rgba(59,130,246,.15);padding:4px 10px;border-radius:12px;font-weight:600;}
.sidebar-tabs{display:flex;border-bottom:1px solid #1e293b;overflow-x:auto;}
.sidebar-tabs .tab{flex:1;text-align:center;padding:10px 4px;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:var(--transition);white-space:nowrap;-webkit-tap-highlight-color:transparent;}
.sidebar-tabs .tab.active{color:var(--accent);border-bottom-color:var(--accent);}
.sidebar-tabs .tab .tab-badge{background:var(--danger);color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:3px;}
.contact-list{flex:1;overflow-y:auto;padding:8px;-webkit-overflow-scrolling:touch;}
.contact-list::-webkit-scrollbar{width:4px}
.contact-list::-webkit-scrollbar-thumb{background:#334155;border-radius:2px}
.contact-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--radius-sm);cursor:pointer;transition:var(--transition);margin-bottom:2px;-webkit-tap-highlight-color:transparent;min-height:52px;}
.contact-item:hover{background:#1e293b}
.contact-item.active{background:rgba(59,130,246,.15)}
.contact-item .avatar{width:40px;height:40px;min-width:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;position:relative;overflow:hidden;}
.contact-item .avatar img{width:100%;height:100%;object-fit:cover;}
.contact-item .avatar .dot{position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid var(--sidebar);}
.contact-item .avatar .dot.online{background:var(--online)}
.contact-item .avatar .dot.offline{background:var(--offline)}
.contact-item .info{flex:1;min-width:0}
.contact-item .info .name{font-size:14px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.contact-item .info .last-msg{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
.contact-item .badge{min-width:20px;height:20px;background:var(--accent);color:#fff;border-radius:10px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 6px;}
.request-item{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:4px;background:#1e293b;}
.request-item .req-info{flex:1;min-width:0}
.request-item .req-info .req-name{font-size:14px;font-weight:600;color:#e2e8f0;}
.request-item .req-info .req-time{font-size:11px;color:var(--muted);margin-top:2px;}
.request-item .req-actions{display:flex;gap:6px;}
.request-item .req-actions button{padding:6px 12px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.request-item .req-actions .accept{background:var(--online);color:#fff;}
.request-item .req-actions .reject{background:transparent;border:1px solid #334155;color:var(--muted);}
.request-item .req-actions .accept:active{opacity:.8}
.request-item .req-actions .reject:active{background:#334155}
.sidebar-footer{padding:12px 16px;border-top:1px solid #1e293b;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sidebar-footer .online-count{font-size:12px;color:var(--muted);flex:1;min-width:60px;}
.sidebar-footer .add-friend-btn{font-size:12px;color:var(--accent);background:rgba(59,130,246,.15);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--font);transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.sidebar-footer .add-friend-btn:hover{background:rgba(59,130,246,.25)}
.sidebar-footer .create-group-btn{font-size:12px;color:var(--online);background:rgba(34,197,94,.15);border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--font);transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.sidebar-footer .create-group-btn:hover{background:rgba(34,197,94,.25)}
.sidebar-footer .logout-btn{font-size:12px;color:var(--muted);background:none;border:1px solid #334155;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--font);transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.sidebar-footer .logout-btn:hover{color:var(--danger);border-color:var(--danger)}

/* ===== Chat Area ===== */
.chat-area{flex:1;display:flex;flex-direction:column;background:var(--chat);min-width:0;}
.chat-header{padding:14px 20px;background:#fff;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:12px;box-shadow:var(--shadow);}
.chat-header .back-btn{display:none;background:none;border:none;font-size:22px;color:var(--ink);cursor:pointer;padding:4px;line-height:1;-webkit-tap-highlight-color:transparent;}
.chat-header .chat-avatar{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;overflow:hidden;}
.chat-header .chat-avatar img{width:100%;height:100%;object-fit:cover;}
.chat-header .chat-title{flex:1;min-width:0}
.chat-header .chat-title .chat-name{font-size:15px;font-weight:700;color:var(--ink);}
.chat-header .chat-title .chat-status{font-size:12px;color:var(--muted);}
.chat-header .chat-title .chat-status.online{color:var(--online)}
.chat-header .chat-title .chat-status.offline{color:var(--offline)}
.chat-header .chat-actions{display:flex;gap:6px;}
.chat-header .chat-actions button{background:none;border:1px solid #e2e8f0;color:var(--muted);font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:var(--font);transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.chat-header .chat-actions button:hover{color:var(--danger);border-color:var(--danger)}
.chat-header .chat-actions .group-info-btn{color:var(--accent);border-color:var(--accent);}
.chat-header .chat-actions .group-info-btn:hover{background:rgba(59,130,246,.1)}
.messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:4px;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;}
.messages::-webkit-scrollbar{width:4px}
.messages::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
.empty-chat{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--muted);}
.empty-chat .empty-icon{font-size:56px;margin-bottom:12px;opacity:.5;}
.empty-chat p{font-size:14px}
.msg-row{display:flex;gap:8px;max-width:75%;animation:msgIn .25s ease-out;}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.msg-row.me{align-self:flex-end;flex-direction:row-reverse}
.msg-row.other{align-self:flex-start}
.msg-row .msg-avatar{width:32px;height:32px;min-width:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;align-self:flex-end;overflow:hidden;}
.msg-row .msg-avatar img{width:100%;height:100%;object-fit:cover;}
.msg-bubble{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-break:break-word;}
.msg-row.me .msg-bubble{background:var(--msg-me);color:var(--msg-me-text);border-bottom-right-radius:4px;}
.msg-row.other .msg-bubble{background:var(--msg-other);color:var(--msg-other-text);border-bottom-left-radius:4px;box-shadow:var(--shadow);}
.msg-row .msg-meta{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:11px;}
.msg-row.me .msg-meta{justify-content:flex-end}
.msg-row .msg-meta .sender{font-weight:600;color:var(--muted);}
.msg-row .msg-meta .time{color:var(--muted);}
.msg-row.me .msg-meta .time{color:rgba(255,255,255,.6)}
.date-divider{text-align:center;margin:16px 0;font-size:12px;color:var(--muted);}
.date-divider span{background:var(--chat);padding:4px 12px;border-radius:10px;}
.input-area{padding:12px 16px;background:#fff;border-top:1px solid var(--rule);display:flex;gap:10px;align-items:flex-end;}
.input-area textarea{flex:1;padding:10px 14px;border:1px solid var(--rule);border-radius:20px;font-size:15px;font-family:var(--font);line-height:1.4;resize:none;outline:none;max-height:120px;min-height:42px;transition:var(--transition);background:var(--chat);-webkit-overflow-scrolling:touch;}
.input-area textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,.1);}
.input-area .send-btn{width:42px;height:42px;min-width:42px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.input-area .send-btn:active{transform:scale(.92);opacity:.85}
.input-area .send-btn:disabled{opacity:.4;cursor:default}

/* ===== Moments Feed ===== */
.moments-panel{flex:1;display:flex;flex-direction:column;background:var(--chat);min-width:0;overflow:hidden;}
.moments-panel.hidden{display:none}
.moments-header{padding:14px 20px;background:#fff;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:12px;box-shadow:var(--shadow);}
.moments-header h3{font-size:16px;font-weight:700;color:var(--ink);}
.moments-header .post-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);-webkit-tap-highlight-color:transparent;}
.moments-feed{flex:1;overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch;}
.moments-feed::-webkit-scrollbar{width:4px}
.moments-feed::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:2px}
.moment-card{background:#fff;border-radius:var(--radius);padding:16px;margin-bottom:14px;box-shadow:var(--shadow);}
.moment-card .moment-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.moment-card .moment-header .m-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;overflow:hidden;}
.moment-card .moment-header .m-avatar img{width:100%;height:100%;object-fit:cover;}
.moment-card .moment-header .m-info{flex:1;}
.moment-card .moment-header .m-info .m-name{font-size:14px;font-weight:700;color:var(--ink);}
.moment-card .moment-header .m-info .m-time{font-size:11px;color:var(--muted);}
.moment-card .moment-body{font-size:14px;color:var(--ink);line-height:1.6;margin-bottom:10px;word-break:break-word;}
.moment-card .moment-body .m-image{width:100%;max-height:240px;object-fit:cover;border-radius:var(--radius-sm);margin-top:8px;cursor:pointer;}
.moment-card .moment-actions{display:flex;gap:16px;border-top:1px solid var(--rule);padding-top:10px;margin-top:4px;}
.moment-card .moment-actions button{background:none;border:none;font-size:13px;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:4px;font-family:var(--font);-webkit-tap-highlight-color:transparent;transition:var(--transition);}
.moment-card .moment-actions button.liked{color:var(--danger);}
.moment-card .moment-actions button:hover{color:var(--accent);}
.moment-card .moment-comments{margin-top:10px;border-top:1px solid var(--rule);padding-top:8px;}
.moment-card .moment-comments .comment{display:flex;gap:6px;margin-bottom:6px;font-size:13px;align-items:flex-start;}
.moment-card .moment-comments .comment .c-name{font-weight:700;color:var(--accent);white-space:nowrap;}
.moment-card .moment-comments .comment .c-text{color:var(--ink);word-break:break-word;}
.moment-card .comment-input{display:flex;gap:8px;margin-top:6px;}
.moment-card .comment-input input{flex:1;padding:6px 10px;border:1px solid var(--rule);border-radius:14px;font-size:13px;font-family:var(--font);outline:none;background:var(--chat);}
.moment-card .comment-input input:focus{border-color:var(--accent);}
.moment-card .comment-input button{background:var(--accent);color:#fff;border:none;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font);}

/* ===== Post Modal ===== */
.post-modal{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;}
.post-modal .post-card{background:var(--bg2);border-radius:16px;padding:24px;width:90%;max-width:420px;box-shadow:var(--shadow-lg);}
.post-modal .post-card h3{font-size:18px;color:#fff;margin-bottom:16px;text-align:center;}
.post-modal .post-card textarea{width:100%;padding:12px;border:2px solid #334155;border-radius:var(--radius-sm);font-size:15px;font-family:var(--font);background:#0f172a;color:#fff;resize:none;outline:none;min-height:80px;margin-bottom:12px;}
.post-modal .post-card textarea:focus{border-color:var(--accent);}
.post-modal .post-card .img-preview{width:100%;max-height:200px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:12px;display:none;}
.post-modal .post-card .img-actions{display:flex;gap:8px;margin-bottom:16px;}
.post-modal .post-card .img-actions label{flex:1;text-align:center;padding:10px;border:2px dashed #334155;border-radius:var(--radius-sm);font-size:13px;color:var(--muted);cursor:pointer;transition:var(--transition);}
.post-modal .post-card .img-actions label:hover{border-color:var(--accent);color:var(--accent);}
.post-modal .post-card .img-actions input[type=file]{display:none;}
.post-modal .btn-row{display:flex;gap:10px;}
.post-modal .btn-row button{flex:1;padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;font-family:var(--font);cursor:pointer;border:none;transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.post-modal .btn-row button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;}
.post-modal .btn-row button.cancel{background:transparent;border:1px solid #334155;color:var(--muted);}

/* ===== Modal ===== */
.modal-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;}
.modal{background:var(--bg2);border-radius:16px;padding:28px 24px;width:90%;max-width:380px;box-shadow:var(--shadow-lg);}
.modal h3{font-size:18px;color:#fff;margin-bottom:16px;text-align:center;}
.modal label{display:block;font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:4px;}
.modal input,.modal textarea{width:100%;padding:12px 16px;border:2px solid #334155;border-radius:var(--radius-sm);font-size:16px;font-family:var(--font);background:#0f172a;color:#fff;outline:none;margin-bottom:12px;transition:var(--transition);}
.modal textarea{resize:none;min-height:60px;}
.modal input:focus,.modal textarea:focus{border-color:var(--accent)}
.modal .btn-row{display:flex;gap:10px;}
.modal .btn-row button{flex:1}
.modal button{padding:12px;border-radius:var(--radius-sm);font-size:14px;font-weight:600;font-family:var(--font);cursor:pointer;border:none;transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.modal button.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;}
.modal button.danger{background:var(--danger);color:#fff;}
.modal button.cancel{background:transparent;border:1px solid #334155;color:var(--muted);}
.modal .modal-error{font-size:12px;color:var(--danger);margin-top:8px;min-height:18px;}
.modal .modal-hint{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;}

/* ===== Avatar Picker ===== */
.avatar-picker{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px;}
.avatar-picker .emoji-opt{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;border:2px solid transparent;transition:var(--transition);background:#1e293b;}
.avatar-picker .emoji-opt:hover,.avatar-picker .emoji-opt.selected{border-color:var(--accent);background:rgba(59,130,246,.15);}
.avatar-picker .color-opt{width:32px;height:32px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:var(--transition);}
.avatar-picker .color-opt:hover,.avatar-picker .color-opt.selected{border-color:#fff;transform:scale(1.15);}
.avatar-upload-label{display:block;text-align:center;padding:10px;border:2px dashed #334155;border-radius:var(--radius-sm);font-size:13px;color:var(--muted);cursor:pointer;margin-bottom:12px;transition:var(--transition);}
.avatar-upload-label:hover{border-color:var(--accent);color:var(--accent);}
.avatar-upload-label input{display:none;}

/* ===== Group Members ===== */
.member-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.member-tag{display:flex;align-items:center;gap:4px;background:rgba(59,130,246,.15);padding:4px 10px;border-radius:14px;font-size:12px;color:var(--accent);font-weight:600;}
.member-tag .remove{font-size:14px;cursor:pointer;opacity:.6;margin-left:2px;}
.member-tag .remove:hover{opacity:1;color:var(--danger);}
.member-checkbox{display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px;color:#e2e8f0;cursor:pointer;}
.member-checkbox input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent);cursor:pointer;}

/* ===== Settings Menu ===== */
.settings-menu{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;}
.settings-menu .settings-card{background:var(--bg2);border-radius:16px;padding:24px;width:90%;max-width:340px;box-shadow:var(--shadow-lg);}
.settings-menu .settings-card h3{font-size:18px;color:#fff;margin-bottom:16px;text-align:center;}
.settings-menu .settings-card .menu-item{display:block;width:100%;text-align:left;padding:14px;background:none;border:none;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px;font-family:var(--font);cursor:pointer;transition:var(--transition);-webkit-tap-highlight-color:transparent;}
.settings-menu .settings-card .menu-item:hover{background:#1e293b;color:#fff;}
.settings-menu .settings-card .menu-item.danger{color:var(--danger);}
.settings-menu .settings-card .menu-item.danger:hover{background:rgba(239,68,68,.1);}
.settings-menu .settings-card .menu-item.cancel{margin-top:8px;text-align:center;color:var(--muted);border:none;}

/* ===== Toast ===== */
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:3000;box-shadow:var(--shadow-lg);animation:toastIn .3s ease-out;pointer-events:none;}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ===== Group info panel ===== */
.group-info-panel{flex:1;display:flex;flex-direction:column;background:var(--chat);min-width:0;overflow:hidden;}
.group-info-panel.hidden{display:none}
.group-info-panel .gi-header{padding:14px 20px;background:#fff;border-bottom:1px solid var(--rule);display:flex;align-items:center;gap:12px;box-shadow:var(--shadow);}
.group-info-panel .gi-header .back-btn{background:none;border:none;font-size:22px;color:var(--ink);cursor:pointer;padding:4px;line-height:1;}
.group-info-panel .gi-header h3{font-size:16px;font-weight:700;color:var(--ink);}
.group-info-panel .gi-body{padding:20px;overflow-y:auto;}
.group-info-panel .gi-body .gi-label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px;margin-top:20px;}
.group-info-panel .gi-body .gi-label:first-child{margin-top:0;}
.group-info-panel .gi-body .gi-member{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--rule);}
.group-info-panel .gi-body .gi-member .gm-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;overflow:hidden;}
.group-info-panel .gi-body .gi-member .gm-avatar img{width:100%;height:100%;object-fit:cover;}
.group-info-panel .gi-body .gi-member .gm-name{font-size:14px;font-weight:600;color:var(--ink);flex:1;}
.group-info-panel .gi-body .gi-member .gm-role{font-size:11px;color:var(--muted);background:var(--chat);padding:2px 8px;border-radius:8px;}
.group-info-panel .gi-body .leave-group-btn{width:100%;margin-top:20px;padding:12px;background:none;border:1px solid var(--danger);color:var(--danger);border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font);-webkit-tap-highlight-color:transparent;}
.group-info-panel .gi-body .leave-group-btn:hover{background:rgba(239,68,68,.1);}

/* ===== Mobile ===== */
@media (max-width:768px){
  .sidebar{position:fixed;inset:0;z-index:100;width:100%;min-width:100%;}
  .sidebar.hidden-mobile{transform:translateX(-100%);}
  .chat-area,.moments-panel,.group-info-panel{position:fixed;inset:0;z-index:50;}
  .chat-header .back-btn{display:block}
  .contact-item{padding:14px 16px;min-height:60px}
  .contact-item .avatar{width:44px;height:44px;min-width:44px;font-size:18px}
  .msg-row{max-width:88%}
  .msg-bubble{padding:12px 16px;font-size:15px}
  .input-area{padding:10px 12px;gap:8px}
  .input-area textarea{font-size:16px}
  .input-area .send-btn{width:44px;height:44px;min-width:44px;font-size:20px}
}
</style>
</head>
<body>

<!-- Auth Screen -->
<div class="auth-overlay" id="authScreen">
  <div class="auth-card" id="authCard">
    <div class="logo">\u{1F4AC}</div>
    <h1>Basic Chatting</h1>
    <p class="subtitle">\u5934\u50CF \xB7 \u52A8\u6001 \xB7 \u7FA4\u804A \xB7 \u5BC6\u7801\u4FDD\u62A4</p>
    <div class="auth-columns">
      <div class="auth-col">
        <h2>\u767B \u5F55</h2>
        <label for="loginName">\u7528\u6237\u540D</label>
        <input type="text" id="loginName" placeholder="\u8F93\u5165\u7528\u6237\u540D..." maxlength="20" autocomplete="off">
        <label for="loginPass">\u5BC6\u7801</label>
        <input type="password" id="loginPass" placeholder="\u8F93\u5165\u5BC6\u7801..." maxlength="30">
        <div class="remember-row">
          <input type="checkbox" id="rememberMe">
          <label for="rememberMe">\u8BB0\u4F4F\u6211</label>
        </div>
        <div class="error-msg" id="loginError"></div>
        <button onclick="doLogin()">\u767B \u5F55</button>
      </div>
      <div class="auth-divider"><span>\u6216</span></div>
      <div class="auth-col">
        <h2>\u6CE8 \u518C</h2>
        <label for="regName">\u7528\u6237\u540D</label>
        <input type="text" id="regName" placeholder="\u8BBE\u7F6E\u7528\u6237\u540D (\u6700\u957F20\u5B57)" maxlength="20" autocomplete="off">
        <label for="regPass">\u5BC6\u7801</label>
        <input type="password" id="regPass" placeholder="\u8BBE\u7F6E\u5BC6\u7801 (\u6700\u5C114\u4F4D)" maxlength="30">
        <label for="regPass2">\u786E\u8BA4\u5BC6\u7801</label>
        <input type="password" id="regPass2" placeholder="\u518D\u6B21\u8F93\u5165\u5BC6\u7801" maxlength="30">
        <div class="error-msg" id="regError"></div>
        <button onclick="doRegister()">\u6CE8 \u518C</button>
      </div>
    </div>
  </div>
</div>

<!-- Main App -->
<div class="app hidden" id="app">
  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="my-avatar" id="myAvatar" onclick="showAvatarPicker()" title="\u70B9\u51FB\u66F4\u6362\u5934\u50CF"></div>
      <h2>Basic Chatting</h2>
      <span class="my-name" id="myNameBadge" onclick="showSettings()" style="cursor:pointer"></span>
    </div>
    <div class="sidebar-tabs">
      <div class="tab active" id="tabFriends" onclick="switchTab('friends')">\u597D\u53CB</div>
      <div class="tab" id="tabGroups" onclick="switchTab('groups')">\u7FA4\u804A</div>
      <div class="tab" id="tabRequests" onclick="switchTab('requests')">\u8BF7\u6C42<span class="tab-badge" id="requestBadge" style="display:none">0</span></div>
      <div class="tab" id="tabMoments" onclick="switchTab('moments')">\u52A8\u6001</div>
    </div>
    <div class="contact-list" id="contactList"></div>
    <div class="sidebar-footer" id="sidebarFooter">
      <span class="online-count" id="onlineCount"></span>
      <button class="add-friend-btn" onclick="showAddFriend()">+ \u597D\u53CB</button>
      <button class="create-group-btn" onclick="showCreateGroup()">+ \u7FA4\u804A</button>
      <button class="logout-btn" onclick="doLogout()">\u9000\u51FA</button>
    </div>
  </div>

  <!-- Chat Area -->
  <div class="chat-area" id="chatArea">
    <div class="chat-header" id="chatHeader">
      <button class="back-btn" onclick="showSidebar()">\u2190</button>
      <div class="chat-avatar" id="chatAvatar"></div>
      <div class="chat-title">
        <div class="chat-name" id="chatName">\u9009\u62E9\u8054\u7CFB\u4EBA</div>
        <div class="chat-status" id="chatStatus"></div>
      </div>
      <div class="chat-actions">
        <button class="group-info-btn" id="groupInfoBtn" onclick="showGroupInfo()" style="display:none">\u7FA4\u4FE1\u606F</button>
        <button id="deleteFriendBtn" onclick="deleteFriend()" style="display:none">\u5220\u9664</button>
      </div>
    </div>
    <div class="messages" id="messages">
      <div class="empty-chat" id="emptyChat">
        <div class="empty-icon">\u{1F4AC}</div>
        <p>\u9009\u62E9\u4E00\u4E2A\u597D\u53CB\u6216\u7FA4\u804A\u5F00\u59CB\u804A\u5929</p>
      </div>
    </div>
    <div class="input-area" id="inputArea">
      <textarea id="msgInput" placeholder="\u8F93\u5165\u6D88\u606F..." rows="1" disabled></textarea>
      <button class="send-btn" id="sendBtn" onclick="sendMessage()" disabled>\u27A4</button>
    </div>
  </div>

  <!-- Moments Panel -->
  <div class="moments-panel hidden" id="momentsPanel">
    <div class="moments-header">
      <button class="back-btn" onclick="showSidebar()" style="display:block">\u2190</button>
      <h3>\u52A8\u6001</h3>
      <button class="post-btn" onclick="showPostMoment()">\u53D1\u5E03</button>
    </div>
    <div class="moments-feed" id="momentsFeed"></div>
  </div>

  <!-- Group Info Panel -->
  <div class="group-info-panel hidden" id="groupInfoPanel">
    <div class="gi-header">
      <button class="back-btn" onclick="hideGroupInfo()" style="display:block">\u2190</button>
      <h3 id="giTitle">\u7FA4\u4FE1\u606F</h3>
    </div>
    <div class="gi-body" id="giBody"></div>
  </div>
</div>

<!-- Add Friend Modal -->
<div class="modal-overlay" id="addFriendModal" style="display:none">
  <div class="modal">
    <h3>\u6DFB\u52A0\u597D\u53CB</h3>
    <label for="addFriendName">\u8F93\u5165\u5BF9\u65B9\u7684\u7528\u6237\u540D</label>
    <input type="text" id="addFriendName" placeholder="\u7528\u6237\u540D..." maxlength="20" autocomplete="off">
    <div class="modal-error" id="addFriendError"></div>
    <div class="btn-row">
      <button class="cancel" onclick="closeAddFriend()">\u53D6\u6D88</button>
      <button class="primary" onclick="sendFriendRequest()">\u53D1\u9001\u8BF7\u6C42</button>
    </div>
  </div>
</div>

<!-- Create Group Modal -->
<div class="modal-overlay" id="createGroupModal" style="display:none">
  <div class="modal" style="max-width:400px;max-height:90vh;overflow-y:auto;">
    <h3>\u521B\u5EFA\u7FA4\u804A</h3>
    <label for="groupName">\u7FA4\u540D\u79F0</label>
    <input type="text" id="groupName" placeholder="\u8F93\u5165\u7FA4\u540D\u79F0..." maxlength="20" autocomplete="off">
    <label>\u9009\u62E9\u6210\u5458</label>
    <div id="groupMemberCheckboxes" style="max-height:180px;overflow-y:auto;margin-bottom:8px;"></div>
    <div class="modal-error" id="groupError"></div>
    <div class="btn-row">
      <button class="cancel" onclick="closeCreateGroup()">\u53D6\u6D88</button>
      <button class="primary" onclick="createGroup()">\u521B\u5EFA</button>
    </div>
  </div>
</div>

<!-- Post Moment Modal -->
<div class="post-modal" id="postMomentModal" style="display:none">
  <div class="post-card">
    <h3>\u53D1\u5E03\u52A8\u6001</h3>
    <textarea id="postText" placeholder="\u5206\u4EAB\u4F60\u7684\u60F3\u6CD5..." maxlength="500"></textarea>
    <img class="img-preview" id="postImgPreview" alt="\u9884\u89C8">
    <div class="img-actions">
      <label for="postImg">\u{1F4F7} \u6DFB\u52A0\u56FE\u7247</label>
      <input type="file" id="postImg" accept="image/*" onchange="previewPostImage(this)">
    </div>
    <div class="btn-row">
      <button class="cancel" onclick="closePostMoment()">\u53D6\u6D88</button>
      <button class="primary" onclick="postMoment()">\u53D1\u5E03</button>
    </div>
  </div>
</div>

<!-- Avatar Picker Modal -->
<div class="modal-overlay" id="avatarPickerModal" style="display:none">
  <div class="modal" style="max-width:400px;">
    <h3>\u9009\u62E9\u5934\u50CF</h3>
    <label class="avatar-upload-label" for="avatarUpload">\u{1F4C1} \u4E0A\u4F20\u56FE\u7247</label>
    <input type="file" id="avatarUpload" accept="image/*" onchange="uploadAvatar(this)">
    <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:8px;">\u6216\u9009\u62E9\u8868\u60C5</div>
    <div class="avatar-picker" id="emojiPicker"></div>
    <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:8px;">\u6216\u9009\u62E9\u989C\u8272</div>
    <div class="avatar-picker" id="colorPicker"></div>
    <div class="btn-row">
      <button class="cancel" onclick="closeAvatarPicker()">\u53D6\u6D88</button>
      <button class="primary" onclick="saveAvatarChoice()">\u4FDD\u5B58</button>
    </div>
  </div>
</div>

<!-- Settings Menu -->
<div class="settings-menu" id="settingsMenu" style="display:none">
  <div class="settings-card">
    <h3>\u8BBE\u7F6E</h3>
    <button class="menu-item" onclick="showAvatarPicker();closeSettings()">\u{1F5BC} \u66F4\u6362\u5934\u50CF</button>
    <button class="menu-item" onclick="showChangePassword()">\u{1F512} \u4FEE\u6539\u5BC6\u7801</button>
    <button class="menu-item danger" onclick="showDeleteAccount()">\u{1F5D1} \u6CE8\u9500\u8D26\u53F7</button>
    <button class="menu-item cancel" onclick="closeSettings()">\u53D6\u6D88</button>
  </div>
</div>

<!-- Change Password Modal -->
<div class="modal-overlay" id="changePassModal" style="display:none">
  <div class="modal">
    <h3>\u4FEE\u6539\u5BC6\u7801</h3>
    <label for="oldPass">\u5F53\u524D\u5BC6\u7801</label>
    <input type="password" id="oldPass" placeholder="\u8F93\u5165\u5F53\u524D\u5BC6\u7801" maxlength="30">
    <label for="newPass">\u65B0\u5BC6\u7801</label>
    <input type="password" id="newPass" placeholder="\u65B0\u5BC6\u7801 (\u6700\u5C114\u4F4D)" maxlength="30">
    <div class="modal-error" id="changePassError"></div>
    <div class="btn-row">
      <button class="cancel" onclick="closeChangePass()">\u53D6\u6D88</button>
      <button class="primary" onclick="changePassword()">\u786E\u8BA4\u4FEE\u6539</button>
    </div>
  </div>
</div>

<!-- Delete Account Modal -->
<div class="modal-overlay" id="deleteAccountModal" style="display:none">
  <div class="modal">
    <h3>\u6CE8\u9500\u8D26\u53F7</h3>
    <p style="color:var(--danger);font-size:14px;text-align:center;margin-bottom:12px;">\u26A0\uFE0F \u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\uFF01</p>
    <p style="color:var(--muted);font-size:13px;text-align:center;margin-bottom:16px;">\u6240\u6709\u6570\u636E\u5C06\u88AB\u6C38\u4E45\u5220\u9664\uFF0C\u5305\u62EC\u6D88\u606F\u3001\u597D\u53CB\u3001\u52A8\u6001\u548C\u7FA4\u804A\u8BB0\u5F55</p>
    <label for="deletePassConfirm">\u8F93\u5165\u5BC6\u7801\u786E\u8BA4</label>
    <input type="password" id="deletePassConfirm" placeholder="\u8F93\u5165\u5BC6\u7801" maxlength="30">
    <div class="modal-error" id="deleteAccountError"></div>
    <div class="btn-row">
      <button class="cancel" onclick="closeDeleteAccount()">\u53D6\u6D88</button>
      <button class="danger" onclick="deleteAccount()">\u786E\u8BA4\u6CE8\u9500</button>
    </div>
  </div>
</div>

<script>
// ===== Constants =====
const AVATAR_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316'];
const AVATAR_EMOJIS = ['\u{1F600}','\u{1F60E}','\u{1F929}','\u{1F607}','\u{1F98A}','\u{1F431}','\u{1F436}','\u{1F43C}','\u{1F428}','\u{1F981}','\u{1F42F}','\u{1F438}','\u{1F435}','\u{1F419}','\u{1F984}','\u{1F41D}','\u{1F338}','\u{1F340}','\u2B50','\u{1F525}','\u{1F48E}','\u{1F3A8}','\u{1F680}','\u{1F308}'];

// ===== State =====
let myName = '', myId = '', myNameLower = '';
let activeContact = null;
let activeChatType = 'friend';
let ws = null;
let heartbeatInterval = null;
let currentTab = 'friends';
let myFriends = {};
let myGroups = {};
let myAvatar = null;
let pendingAvatar = null;
let onlineUsers = {}; // { nameLower: { id, name, online, avatar } }
let allMessages = [];
let allGroupMessages = {};
let allMoments = [];
let friendRequests = [];
let groupInvites = [];
let unreadRead = {}; // { contactId: timestamp }
let groupUnreadRead = {}; // { groupId: timestamp }

// Determine WebSocket URL
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

// ===== Init =====
function autoLogin() {
  const saved = localStorage.getItem('bc_remember');
  if (!saved) return;
  try {
    const creds = JSON.parse(saved);
    if (creds.name && creds.pass) {
      document.getElementById('loginName').value = creds.name;
      document.getElementById('loginPass').value = creds.pass;
      document.getElementById('rememberMe').checked = true;
      doLogin();
    }
  } catch(e) {}
}

function init() {
  bindEnter('loginName', doLogin);
  bindEnter('loginPass', doLogin);
  bindEnter('regName', doRegister);
  bindEnter('regPass', doRegister);
  bindEnter('regPass2', doRegister);
  bindEnter('addFriendName', sendFriendRequest);
  bindEnter('groupName', createGroup);
  bindEnter('oldPass', changePassword);
  bindEnter('newPass', changePassword);
  bindEnter('deletePassConfirm', deleteAccount);
  const msgInput = document.getElementById('msgInput');
  if (msgInput) {
    msgInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    msgInput.addEventListener('input', function() {
      this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }
}

function bindEnter(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') fn(); });
}

// ===== Auth =====
function switchToRegister() {
  const loginFields = document.getElementById('loginFields');
  const regFields = document.getElementById('regFields');
  if (loginFields) loginFields.style.display = 'none';
  if (regFields) regFields.style.display = 'block';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}
function switchToLogin() {
  const regFields = document.getElementById('regFields');
  const loginFields = document.getElementById('loginFields');
  if (regFields) regFields.style.display = 'none';
  if (loginFields) loginFields.style.display = 'block';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}

function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const errEl = document.getElementById('regError');
  if (!name) { errEl.textContent = '\u8BF7\u8F93\u5165\u7528\u6237\u540D'; return; }
  if (name.length < 2) { errEl.textContent = '\u7528\u6237\u540D\u81F3\u5C112\u4E2A\u5B57\u7B26'; return; }
  if (pass.length < 4) { errEl.textContent = '\u5BC6\u7801\u81F3\u5C114\u4F4D'; return; }
  if (pass !== pass2) { errEl.textContent = '\u4E24\u6B21\u5BC6\u7801\u4E0D\u4E00\u81F4'; return; }

  // Connect to server for registration
  const tempWs = new WebSocket(WS_URL);
  tempWs.onopen = function() {
    tempWs.send(JSON.stringify({ type: 'register', name, pass }));
  };
  tempWs.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.type === 'register_result') {
      if (data.ok) {
        showToast('\u6CE8\u518C\u6210\u529F\uFF01\u8BF7\u767B\u5F55');
        document.getElementById('loginName').value = name;
        switchToLogin();
      } else {
        errEl.textContent = data.error;
      }
      tempWs.close();
    }
  };
  tempWs.onerror = function() { errEl.textContent = '\u65E0\u6CD5\u8FDE\u63A5\u670D\u52A1\u5668'; tempWs.close(); };
}

function doLogin() {
  const name = document.getElementById('loginName').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  if (!name) { errEl.textContent = '\u8BF7\u8F93\u5165\u7528\u6237\u540D'; return; }
  if (!pass) { errEl.textContent = '\u8BF7\u8F93\u5165\u5BC6\u7801'; return; }

  const tempWs = new WebSocket(WS_URL);
  tempWs.onopen = function() {
    tempWs.send(JSON.stringify({ type: 'login', name, pass }));
  };
  tempWs.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.type === 'login_result') {
      if (data.ok) {
        myName = data.name;
        myId = data.id;
        myNameLower = data.name.toLowerCase();
        myAvatar = data.avatar || { type: 'color', value: getAvatarColor(myName) };
        myFriends = data.friends || {};
        myGroups = data.groups || {};
        friendRequests = data.friendRequests || [];
        groupInvites = data.groupInvites || [];
        allMessages = data.messages || [];
        allGroupMessages = data.groupMessages || {};
        allMoments = data.moments || [];
        loadReadMarkers();

        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('myNameBadge').textContent = myName;
        renderMyAvatar();

        tempWs.close();
        connectWebSocket();
        // \u6CE8\u518C\u6210\u529F\u81EA\u52A8\u8BB0\u4F4F
        localStorage.setItem('bc_remember', JSON.stringify({ name: regName, pass: regPass }));
        document.getElementById('rememberMe').checked = true;
        renderContacts();
        updateOnlineCount();
        updateRequestBadge();
        // \u8BB0\u4F4F\u6211
        if (document.getElementById('rememberMe').checked) {
          localStorage.setItem('bc_remember', JSON.stringify({ name, pass }));
        } else {
          localStorage.removeItem('bc_remember');
        }
      } else {
        errEl.textContent = data.error;
        tempWs.close();
      }
    }
  };
  tempWs.onerror = function() { errEl.textContent = '\u65E0\u6CD5\u8FDE\u63A5\u670D\u52A1\u5668'; tempWs.close(); };
}

function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  ws.onopen = function() {
    ws.send(JSON.stringify({ type: 'join', name: myName, id: myId }));
    startHeartbeat();
  };
  ws.onmessage = handleServerMessage;
  ws.onclose = function() {
    clearInterval(heartbeatInterval);
    // Auto reconnect
    setTimeout(function() {
      if (myId) connectWebSocket();
    }, 3000);
  };
  ws.onerror = function() { /* will retry on close */ };
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(function() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }, 10000);
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ===== Server Message Handler =====
function handleServerMessage(e) {
  const data = JSON.parse(e.data);
  switch (data.type) {
    case 'online_users':
      onlineUsers = {};
      (data.users || []).forEach(function(u) {
        onlineUsers[u.name.toLowerCase()] = u;
      });
      renderContacts();
      updateOnlineCount();
      updateChatHeader();
      break;
    case 'friends_updated':
      myFriends = data.friends || {};
      if (data.friendRequests !== undefined) friendRequests = data.friendRequests;
      updateRequestBadge();
      renderContacts();
      updateChatHeader();
      break;
    case 'friend_requests_updated':
      if (data.requests !== undefined) friendRequests = data.requests;
      updateRequestBadge();
      renderContacts();
      break;
    case 'friend_request_result':
      if (data.ok) showToast('\u597D\u53CB\u8BF7\u6C42\u5DF2\u53D1\u9001');
      else showToast(data.error || '\u53D1\u9001\u5931\u8D25');
      break;
    case 'groups_updated':
      myGroups = data.groups || {};
      if (data.groupInvites !== undefined) groupInvites = data.groupInvites;
      updateRequestBadge();
      renderContacts();
      updateChatHeader();
      break;
    case 'group_invites_updated':
      if (data.groupInvites !== undefined) groupInvites = data.groupInvites;
      updateRequestBadge();
      renderContacts();
      break;
    case 'group_create_result':
      if (data.ok) {
        myGroups[data.groupId] = data.group;
        showToast('\u7FA4\u804A\u5DF2\u521B\u5EFA');
        renderContacts();
      } else {
        showToast(data.error || '\u521B\u5EFA\u5931\u8D25');
      }
      break;
    case 'chat':
      allMessages.push({ fromId: data.fromId, fromName: data.fromName, toId: myId, text: data.text, ts: data.ts });
      if (activeContact !== data.fromId || activeChatType !== 'friend') {
        incrementUnread(data.fromId);
      }
      if (activeContact === data.fromId && activeChatType === 'friend' && currentTab === 'friends') {
        renderMessages();
        markRead(data.fromId);
      }
      renderContacts();
      break;
    case 'chat_sent':
      allMessages.push(data.msg);
      renderMessages();
      renderContacts();
      break;
    case 'group_chat':
      if (!allGroupMessages[data.groupId]) allGroupMessages[data.groupId] = [];
      allGroupMessages[data.groupId].push({ fromId: data.fromId, fromName: data.fromName, text: data.text, ts: data.ts });
      if (activeContact !== data.groupId || activeChatType !== 'group') {
        incrementGroupUnread(data.groupId);
      }
      if (activeContact === data.groupId && activeChatType === 'group' && currentTab === 'groups') {
        renderMessages();
        markGroupRead(data.groupId);
      }
      renderContacts();
      break;
    case 'group_chat_sent':
      if (!allGroupMessages[data.groupId]) allGroupMessages[data.groupId] = [];
      allGroupMessages[data.groupId].push(data.msg);
      renderMessages();
      renderContacts();
      break;
    case 'moments_updated':
      allMoments = data.moments || [];
      if (currentTab === 'moments') renderMoments();
      break;
    case 'moment_posted':
      allMoments.push(data.moment);
      if (currentTab === 'moments') renderMoments();
      break;
    case 'change_password_result':
      if (data.ok) { showToast('\u5BC6\u7801\u4FEE\u6539\u6210\u529F'); closeChangePass(); }
      else document.getElementById('changePassError').textContent = data.error;
      break;
    case 'delete_account_result':
      if (data.ok) {
        showToast('\u8D26\u53F7\u5DF2\u6CE8\u9500');
        if (ws) ws.close();
        clearInterval(heartbeatInterval);
        setTimeout(function() {
          document.getElementById('app').classList.add('hidden');
          document.getElementById('authScreen').style.display = 'flex';
          document.getElementById('loginName').value = '';
          document.getElementById('deleteAccountModal').style.display = 'none';
          resetState();
        }, 500);
      } else {
        document.getElementById('deleteAccountError').textContent = data.error;
      }
      break;
    case 'toast':
      showToast(data.text);
      break;
  }
}

function resetState() {
  activeContact = null; myId = ''; myName = ''; myNameLower = '';
  myFriends = {}; myGroups = {}; myAvatar = null;
  allMessages = []; allGroupMessages = {}; allMoments = [];
  friendRequests = []; groupInvites = []; onlineUsers = {};
}

// ===== Avatar =====
function renderAvatar(el, avatarData, fallbackName, size) {
  if (!el || !fallbackName) return;
  if (avatarData && avatarData.type === 'image' && avatarData.value) {
    el.innerHTML = '<img src="' + avatarData.value + '" alt="">';
    el.style.background = 'transparent';
  } else if (avatarData && avatarData.type === 'emoji') {
    el.innerHTML = avatarData.value;
    el.style.background = 'transparent';
    if (size) el.style.fontSize = (size === 'sm' ? '14px' : '18px');
  } else {
    el.innerHTML = getInitials(fallbackName);
    el.style.background = avatarData && avatarData.type === 'color' ? avatarData.value : getAvatarColor(fallbackName);
    if (size) el.style.fontSize = (size === 'sm' ? '12px' : '16px');
  }
}

function renderMyAvatar() {
  renderAvatar(document.getElementById('myAvatar'), myAvatar, myName, 'sm');
}

function showAvatarPicker() {
  pendingAvatar = myAvatar ? { ...myAvatar } : { type: 'color', value: getAvatarColor(myName) };
  document.getElementById('avatarPickerModal').style.display = 'flex';
  renderEmojiPicker();
  renderColorPicker();
  document.getElementById('avatarUpload').value = '';
}
function closeAvatarPicker() { document.getElementById('avatarPickerModal').style.display = 'none'; pendingAvatar = null; }
function saveAvatarChoice() {
  if (pendingAvatar) {
    myAvatar = pendingAvatar;
    send({ type: 'avatar_update', avatar: myAvatar });
    renderMyAvatar();
    renderContacts();
    if (activeContact) updateChatHeader();
  }
  closeAvatarPicker();
}
function renderEmojiPicker() {
  const el = document.getElementById('emojiPicker');
  let html = '';
  AVATAR_EMOJIS.forEach(function(e) {
    html += '<div class="emoji-opt' + (pendingAvatar && pendingAvatar.type === 'emoji' && pendingAvatar.value === e ? ' selected' : '') + '" onclick="selectEmoji(\\'' + e + '\\')">' + e + '</div>';
  });
  el.innerHTML = html;
}
function selectEmoji(emoji) { pendingAvatar = { type: 'emoji', value: emoji }; renderEmojiPicker(); renderColorPicker(); }
function renderColorPicker() {
  const el = document.getElementById('colorPicker');
  let html = '';
  AVATAR_COLORS.forEach(function(c) {
    html += '<div class="color-opt' + (pendingAvatar && pendingAvatar.type === 'color' && pendingAvatar.value === c ? ' selected' : '') + '" style="background:' + c + '" onclick="selectColor(\\'' + c + '\\')"></div>';
  });
  el.innerHTML = html;
}
function selectColor(color) { pendingAvatar = { type: 'color', value: color }; renderEmojiPicker(); renderColorPicker(); }
function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    pendingAvatar = { type: 'image', value: e.target.result };
    renderEmojiPicker(); renderColorPicker();
  };
  reader.readAsDataURL(file);
}

// ===== Settings =====
function showSettings() { document.getElementById('settingsMenu').style.display = 'flex'; }
function closeSettings() { document.getElementById('settingsMenu').style.display = 'none'; }
function showChangePassword() { closeSettings(); document.getElementById('changePassModal').style.display = 'flex'; document.getElementById('oldPass').value = ''; document.getElementById('newPass').value = ''; document.getElementById('changePassError').textContent = ''; }
function closeChangePass() { document.getElementById('changePassModal').style.display = 'none'; }
function changePassword() {
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const errEl = document.getElementById('changePassError');
  if (!oldPass || !newPass) { errEl.textContent = '\u8BF7\u586B\u5199\u6240\u6709\u5B57\u6BB5'; return; }
  if (newPass.length < 4) { errEl.textContent = '\u65B0\u5BC6\u7801\u81F3\u5C114\u4F4D'; return; }
  send({ type: 'change_password', oldPass, newPass });
}
function showDeleteAccount() { closeSettings(); document.getElementById('deleteAccountModal').style.display = 'flex'; document.getElementById('deletePassConfirm').value = ''; document.getElementById('deleteAccountError').textContent = ''; }
function closeDeleteAccount() { document.getElementById('deleteAccountModal').style.display = 'none'; }
function deleteAccount() {
  const pass = document.getElementById('deletePassConfirm').value;
  const errEl = document.getElementById('deleteAccountError');
  if (!pass) { errEl.textContent = '\u8BF7\u8F93\u5165\u5BC6\u7801'; return; }
  send({ type: 'delete_account', pass });
}

// ===== Friends =====
function isFriend(nameLower) {
  return !!myFriends[nameLower];
}
function showAddFriend() {
  document.getElementById('addFriendModal').style.display = 'flex';
  document.getElementById('addFriendName').value = '';
  document.getElementById('addFriendError').textContent = '';
  document.getElementById('addFriendName').focus();
}
function closeAddFriend() { document.getElementById('addFriendModal').style.display = 'none'; }
function sendFriendRequest() {
  const name = document.getElementById('addFriendName').value.trim();
  const errEl = document.getElementById('addFriendError');
  if (!name) { errEl.textContent = '\u8BF7\u8F93\u5165\u7528\u6237\u540D'; return; }
  if (name.toLowerCase() === myNameLower) { errEl.textContent = '\u4E0D\u80FD\u6DFB\u52A0\u81EA\u5DF1\u4E3A\u597D\u53CB'; return; }
  if (isFriend(name.toLowerCase())) { errEl.textContent = '\u5DF2\u7ECF\u662F\u597D\u53CB\u4E86'; return; }
  send({ type: 'friend_request', targetName: name });
  showToast('\u5DF2\u5411 ' + name + ' \u53D1\u9001\u597D\u53CB\u8BF7\u6C42');
  closeAddFriend();
}
function acceptRequest(reqNameLower) {
  send({ type: 'friend_accept', fromNameLower: reqNameLower });
}
function rejectRequest(reqNameLower) {
  send({ type: 'friend_reject', fromNameLower: reqNameLower });
}
function deleteFriend() {
  if (!activeContact || activeChatType !== 'friend') return;
  const name = myFriends[activeContact] ? myFriends[activeContact].name : '';
  if (!confirm('\u786E\u5B9A\u8981\u5220\u9664\u597D\u53CB ' + name + ' \u5417\uFF1F')) return;
  send({ type: 'friend_removed', friendNameLower: activeContact });
  delete myFriends[activeContact];
  if (activeContact === activeContact) { activeContact = null; updateChatHeader(); renderMessages(); }
  renderContacts();
  showToast('\u5DF2\u5220\u9664\u597D\u53CB ' + name);
}

// ===== Groups =====
function showCreateGroup() {
  document.getElementById('createGroupModal').style.display = 'flex';
  document.getElementById('groupName').value = '';
  document.getElementById('groupError').textContent = '';
  renderGroupMemberCheckboxes();
  document.getElementById('groupName').focus();
}
function closeCreateGroup() { document.getElementById('createGroupModal').style.display = 'none'; }
function renderGroupMemberCheckboxes() {
  const el = document.getElementById('groupMemberCheckboxes');
  let html = '';
  for (const nameLower in myFriends) {
    html += '<label class="member-checkbox"><input type="checkbox" value="' + nameLower + '"><span>' + escapeHtml(myFriends[nameLower].name) + '</span></label>';
  }
  if (!html) html = '<p style="color:var(--muted);font-size:13px;padding:8px 0;">\u6682\u65E0\u597D\u53CB\uFF0C\u8BF7\u5148\u6DFB\u52A0\u597D\u53CB</p>';
  el.innerHTML = html;
}
function createGroup() {
  const name = document.getElementById('groupName').value.trim();
  const errEl = document.getElementById('groupError');
  if (!name) { errEl.textContent = '\u8BF7\u8F93\u5165\u7FA4\u540D\u79F0'; return; }
  const checks = document.querySelectorAll('#groupMemberCheckboxes input:checked');
  if (checks.length === 0) { errEl.textContent = '\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u6210\u5458'; return; }
  const memberIds = [];
  checks.forEach(function(cb) { memberIds.push(cb.value); });
  send({ type: 'group_create', name, memberIds });
  closeCreateGroup();
}
function acceptGroupInvite(groupId) {
  send({ type: 'group_accept', groupId });
}
function rejectGroupInvite(groupId) {
  groupInvites = groupInvites.filter(function(i) { return i.groupId !== groupId; });
  send({ type: 'group_reject', groupId });
  updateRequestBadge();
  renderContacts();
}
function showGroupInfo() {
  if (!activeContact || activeChatType !== 'group') return;
  const group = myGroups[activeContact];
  if (!group) return;
  document.getElementById('giTitle').textContent = group.name;
  let html = '<div class="gi-label">\u7FA4\u540D\u79F0</div><p style="font-size:16px;font-weight:700;color:var(--ink);">' + escapeHtml(group.name) + '</p>';
  html += '<div class="gi-label">\u6210\u5458 (' + Object.keys(group.members).length + '\u4EBA)</div>';
  for (const ml in group.members) {
    const m = group.members[ml];
    const name = m.name;
    const u = onlineUsers[ml];
    const avatar = u ? u.avatar : null;
    html += '<div class="gi-member"><div class="gm-avatar">';
    if (avatar && avatar.type === 'image' && avatar.value) html += '<img src="' + avatar.value + '" alt="">';
    else if (avatar && avatar.type === 'emoji') html += avatar.value;
    else html += getInitials(name);
    html += '</div><div class="gm-name">' + escapeHtml(name) + (ml === group.ownerId ? ' (\u7FA4\u4E3B)' : '') + '</div>';
    html += '<div class="gm-role">' + (m.role === 'owner' ? '\u7FA4\u4E3B' : '\u6210\u5458') + '</div></div>';
  }
  if (group.ownerId !== myNameLower) {
    html += '<button class="leave-group-btn" onclick="leaveGroup()">\u9000\u51FA\u7FA4\u804A</button>';
  }
  document.getElementById('giBody').innerHTML = html;
  document.getElementById('chatArea').style.display = 'none';
  document.getElementById('momentsPanel').classList.add('hidden');
  document.getElementById('groupInfoPanel').classList.remove('hidden');
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.add('hidden-mobile');
}
function hideGroupInfo() {
  document.getElementById('groupInfoPanel').classList.add('hidden');
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('momentsPanel').classList.add('hidden');
}
function leaveGroup() {
  if (!activeContact || activeChatType !== 'group') return;
  const group = myGroups[activeContact];
  if (!group) return;
  if (!confirm('\u786E\u5B9A\u8981\u9000\u51FA\u7FA4\u804A ' + group.name + ' \u5417\uFF1F')) return;
  send({ type: 'group_leave', groupId: activeContact });
  delete myGroups[activeContact];
  activeContact = null;
  hideGroupInfo();
  updateChatHeader();
  renderMessages();
  renderContacts();
  showToast('\u5DF2\u9000\u51FA\u7FA4\u804A');
}

// ===== Moments =====
function showPostMoment() {
  document.getElementById('postMomentModal').style.display = 'flex';
  document.getElementById('postText').value = '';
  document.getElementById('postImgPreview').style.display = 'none';
  document.getElementById('postImg').value = '';
}
function closePostMoment() { document.getElementById('postMomentModal').style.display = 'none'; }
function previewPostImage(input) {
  const file = input.files[0];
  const preview = document.getElementById('postImgPreview');
  if (!file) { preview.style.display = 'none'; return; }
  if (file.size > 500 * 1024) {
    showToast('\u56FE\u7247\u8FC7\u5927\uFF08\u6700\u5927500KB\uFF09\uFF0C\u8BF7\u538B\u7F29\u540E\u518D\u4E0A\u4F20');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const maxW = 800, maxH = 800;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      preview.src = canvas.toDataURL('image/jpeg', 0.7);
      preview.style.display = 'block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function postMoment() {
  const textEl = document.getElementById('postText');
  const text = textEl ? textEl.value.trim() : '';
  const imgPreview = document.getElementById('postImgPreview');
  const imgData = (imgPreview && imgPreview.style.display !== 'none') ? imgPreview.src : null;
  if (!text && !imgData) { showToast('\u8BF7\u8F93\u5165\u5185\u5BB9\u6216\u6DFB\u52A0\u56FE\u7247'); return; }
  if (text.length > 500) { showToast('\u5185\u5BB9\u4E0D\u80FD\u8D85\u8FC7500\u5B57'); return; }
  send({ type: 'moment_post', text, image: imgData });
  closePostMoment();
  showToast('\u53D1\u5E03\u6210\u529F');
}
function likeMoment(momentId) {
  send({ type: 'moment_like', momentId });
}
function commentMoment(momentId) {
  const input = document.getElementById('commentInput_' + momentId);
  const text = input.value.trim();
  if (!text) return;
  send({ type: 'moment_comment', momentId, text });
  input.value = '';
}
function renderMoments() {
  const el = document.getElementById('momentsFeed');
  if (!allMoments || allMoments.length === 0) {
    el.innerHTML = '<div class="empty-chat" style="padding:40px"><div class="empty-icon">\u{1F4F7}</div><p>\u6682\u65E0\u52A8\u6001</p><p style="color:var(--muted);font-size:13px;margin-top:8px;">\u70B9\u51FB\u53F3\u4E0A\u89D2"\u53D1\u5E03"\u6309\u94AE\u5206\u4EAB\u7B2C\u4E00\u6761\u52A8\u6001\u5427</p></div>';
    return;
  }
  const visible = allMoments.filter(function(m) {
    return m.authorNameLower === myNameLower || isFriend(m.authorNameLower);
  }).reverse();
  if (visible.length === 0) {
    el.innerHTML = '<div class="empty-chat" style="padding:40px"><div class="empty-icon">\u{1F4F7}</div><p>\u6682\u65E0\u52A8\u6001</p><p style="color:var(--muted);font-size:13px;margin-top:8px;">\u53D1\u5E03\u7B2C\u4E00\u6761\u52A8\u6001\uFF0C\u6216\u6DFB\u52A0\u597D\u53CB\u540E\u5C31\u80FD\u770B\u5230\u66F4\u591A\u5185\u5BB9</p></div>';
    return;
  }
  let html = '';
  visible.forEach(function(m) {
    const d = new Date(m.ts);
    const avatar = m.authorAvatar || null;
    const isLiked = m.likes && m.likes.indexOf(myNameLower) >= 0;
    html += '<div class="moment-card">';
    html += '<div class="moment-header"><div class="m-avatar">';
    if (avatar && avatar.type === 'image' && avatar.value) html += '<img src="' + avatar.value + '" alt="">';
    else if (avatar && avatar.type === 'emoji') html += avatar.value;
    else html += getInitials(m.authorName);
    html += '</div><div class="m-info"><div class="m-name">' + escapeHtml(m.authorName) + (m.authorNameLower === myNameLower ? ' (\u6211)' : '') + '</div>';
    html += '<div class="m-time">' + d.toLocaleString('zh-CN') + '</div></div></div>';
    if (m.text) html += '<div class="moment-body">' + escapeHtml(m.text) + '</div>';
    if (m.image) html += '<img class="m-image" src="' + m.image + '" alt="\u56FE\u7247" onclick="this.classList.toggle(\\'expanded\\');this.style.maxHeight=this.classList.contains(\\'expanded\\')?\\'none\\':\\'240px\\'">';
    html += '<div class="moment-actions">';
    html += '<button class="' + (isLiked ? 'liked' : '') + '" onclick="likeMoment(\\'' + m.id + '\\')">\u2764 ' + (m.likes ? m.likes.length : 0) + '</button>';
    html += '<button>\u{1F4AC} ' + (m.comments ? m.comments.length : 0) + '</button></div>';
    if (m.comments && m.comments.length > 0) {
      html += '<div class="moment-comments">';
      m.comments.forEach(function(c) {
        html += '<div class="comment"><span class="c-name">' + escapeHtml(c.authorName) + ':</span><span class="c-text">' + escapeHtml(c.text) + '</span></div>';
      });
      html += '</div>';
    }
    html += '<div class="comment-input"><input id="commentInput_' + m.id + '" placeholder="\u5199\u8BC4\u8BBA..." maxlength="100"><button onclick="commentMoment(\\'' + m.id + '\\')">\u53D1\u9001</button></div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

// ===== Tab Switching =====
function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tabFriends').classList.toggle('active', tab === 'friends');
  document.getElementById('tabGroups').classList.toggle('active', tab === 'groups');
  document.getElementById('tabRequests').classList.toggle('active', tab === 'requests');
  document.getElementById('tabMoments').classList.toggle('active', tab === 'moments');

  const chatArea = document.getElementById('chatArea');
  const momentsPanel = document.getElementById('momentsPanel');
  const groupInfoPanel = document.getElementById('groupInfoPanel');
  groupInfoPanel.classList.add('hidden');

  if (tab === 'moments') {
    chatArea.style.display = 'none';
    momentsPanel.classList.remove('hidden');
    renderMoments();
  } else {
    chatArea.style.display = 'flex';
    momentsPanel.classList.add('hidden');
    activeContact = null;
    updateChatHeader();
    renderMessages();
  }
  renderContacts();
}

function updateRequestBadge() {
  const total = friendRequests.length + groupInvites.length;
  const badge = document.getElementById('requestBadge');
  if (total > 0) { badge.style.display = 'inline'; badge.textContent = total; }
  else { badge.style.display = 'none'; }
}

// ===== Message Management =====
function loadReadMarkers() {
  try { unreadRead = JSON.parse(localStorage.getItem('bc_read_v4_' + myNameLower)) || {}; } catch(e) { unreadRead = {}; }
  try { groupUnreadRead = JSON.parse(localStorage.getItem('bc_gread_v4_' + myNameLower)) || {}; } catch(e) { groupUnreadRead = {}; }
}
function saveReadMarkers() {
  localStorage.setItem('bc_read_v4_' + myNameLower, JSON.stringify(unreadRead));
  localStorage.setItem('bc_gread_v4_' + myNameLower, JSON.stringify(groupUnreadRead));
}
function markRead(nameLower) {
  unreadRead[nameLower] = Date.now();
  saveReadMarkers();
}
function markGroupRead(groupId) {
  groupUnreadRead[groupId] = Date.now();
  saveReadMarkers();
}
function incrementUnread(nameLower) {
  const lastRead = unreadRead[nameLower] || 0;
  let count = 0;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const m = allMessages[i];
    if (m.fromId === nameLower && m.ts > lastRead) count++;
    else if (m.ts <= lastRead) break;
  }
  return count;
}
function incrementGroupUnread(groupId) {
  const msgs = allGroupMessages[groupId] || [];
  const lastRead = groupUnreadRead[groupId] || 0;
  let count = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].fromId !== myId && msgs[i].ts > lastRead) count++;
    else if (msgs[i].ts <= lastRead) break;
  }
  return count;
}

// ===== Contact List =====
function getContactList() {
  if (currentTab === 'friends') {
    const contacts = [];
    for (const nameLower in myFriends) {
      const u = onlineUsers[nameLower];
      contacts.push({
        id: nameLower, type: 'friend',
        name: myFriends[nameLower].name,
        online: !!u, lastSeen: u ? Date.now() : 0,
        avatar: u ? u.avatar : null
      });
    }
    contacts.sort(function(a, b) {
      if (a.online !== b.online) return b.online - a.online;
      return b.lastSeen - a.lastSeen;
    });
    return contacts;
  } else if (currentTab === 'groups') {
    const contacts = [];
    for (const gid in myGroups) {
      contacts.push({ id: gid, type: 'group', name: myGroups[gid].name, online: true, lastSeen: myGroups[gid].createdAt });
    }
    return contacts;
  } else if (currentTab === 'requests') {
    return { friendReqs: friendRequests, groupInvites: groupInvites };
  }
  return [];
}

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name) { return name ? name.charAt(0).toUpperCase() : '?'; }

function getLastMessage(nameLower) {
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const m = allMessages[i];
    if ((m.fromId === nameLower && m.toId === myId) || (m.fromId === myId && m.toId === nameLower)) {
      const prefix = m.fromId === myId ? '\u6211: ' : '';
      const t = prefix + m.text;
      return t.length > 25 ? t.substring(0, 25) + '...' : t;
    }
  }
  return '';
}
function getGroupLastMessage(groupId) {
  const msgs = allGroupMessages[groupId] || [];
  if (msgs.length === 0) return '';
  const last = msgs[msgs.length - 1];
  const prefix = last.fromId === myId ? '\u6211: ' : last.fromName + ': ';
  return (prefix + last.text).length > 25 ? (prefix + last.text).substring(0, 25) + '...' : prefix + last.text;
}

// ===== Render =====
function renderContacts() {
  const container = document.getElementById('contactList');
  let html = '';
  if (currentTab === 'friends' || currentTab === 'groups') {
    const contacts = getContactList();
    contacts.forEach(function(c) {
      const unread = c.type === 'friend' ? incrementUnread(c.id) : incrementGroupUnread(c.id);
      const active = activeContact === c.id;
      const lastMsg = c.type === 'friend' ? getLastMessage(c.id) : getGroupLastMessage(c.id);
      const avatar = c.avatar || null;
      html += '<div class="contact-item' + (active ? ' active' : '') + '" onclick="selectContact(\\'' + c.id + '\\',\\'' + escapeHtmlAttr(c.name) + '\\',\\'' + c.type + '\\')">';
      html += '<div class="avatar">';
      if (avatar && avatar.type === 'image' && avatar.value) html += '<img src="' + avatar.value + '" alt="">';
      else if (avatar && avatar.type === 'emoji') html += avatar.value;
      else {
        html += '<span>' + getInitials(c.name) + '</span>';
        html += '<span class="dot ' + (c.online ? 'online' : 'offline') + '"></span>';
      }
      html += '</div>';
      html += '<div class="info"><div class="name">' + escapeHtml(c.name) + (c.type === 'group' ? ' \u{1F465}' : '') + '</div>';
      if (lastMsg) html += '<div class="last-msg">' + escapeHtml(lastMsg) + '</div>';
      html += '</div>';
      if (unread > 0) html += '<div class="badge">' + (unread > 99 ? '99+' : unread) + '</div>';
      html += '</div>';
    });
    if (contacts.length === 0) {
      html = '<div style="text-align:center;padding:40px 20px;color:#64748b;font-size:13px;line-height:1.8">' + (currentTab === 'friends' ? '\u8FD8\u6CA1\u6709\u597D\u53CB' : '\u8FD8\u6CA1\u6709\u7FA4\u804A') + '<br>\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5F00\u59CB</div>';
    }
  } else if (currentTab === 'requests') {
    const data = getContactList();
    if (data.friendReqs.length > 0) {
      html += '<div style="font-size:12px;color:var(--muted);padding:8px 14px;">\u597D\u53CB\u8BF7\u6C42</div>';
      data.friendReqs.forEach(function(r) {
        html += '<div class="request-item">';
        html += '<div class="avatar" style="background:' + getAvatarColor(r.name) + '">' + getInitials(r.name) + '</div>';
        html += '<div class="req-info"><div class="req-name">' + escapeHtml(r.name) + '</div><div class="req-time">' + new Date(r.ts).toLocaleString('zh-CN') + '</div></div>';
        html += '<div class="req-actions"><button class="accept" onclick="event.stopPropagation();acceptRequest(\\'' + r.nameLower + '\\')">\u63A5\u53D7</button><button class="reject" onclick="event.stopPropagation();rejectRequest(\\'' + r.nameLower + '\\')">\u62D2\u7EDD</button></div></div>';
      });
    }
    if (data.groupInvites.length > 0) {
      html += '<div style="font-size:12px;color:var(--muted);padding:8px 14px;">\u7FA4\u804A\u9080\u8BF7</div>';
      data.groupInvites.forEach(function(inv) {
        html += '<div class="request-item">';
        html += '<div class="avatar" style="background:var(--online)">\u{1F465}</div>';
        html += '<div class="req-info"><div class="req-name">' + escapeHtml(inv.groupName) + '</div><div class="req-time">\u6765\u81EA ' + escapeHtml(inv.fromName) + '</div></div>';
        html += '<div class="req-actions"><button class="accept" onclick="event.stopPropagation();acceptGroupInvite(\\'' + inv.groupId + '\\')">\u52A0\u5165</button><button class="reject" onclick="event.stopPropagation();rejectGroupInvite(\\'' + inv.groupId + '\\')">\u62D2\u7EDD</button></div></div>';
      });
    }
    if (data.friendReqs.length === 0 && data.groupInvites.length === 0) {
      html = '<div style="text-align:center;padding:40px 20px;color:#64748b;font-size:13px;line-height:1.8">\u6682\u65E0\u8BF7\u6C42</div>';
    }
  }
  container.innerHTML = html;
}

function renderMessages() {
  const container = document.getElementById('messages');
  const emptyChat = document.getElementById('emptyChat');
  if (!activeContact) {
    emptyChat.style.display = 'flex'; container.innerHTML = ''; container.appendChild(emptyChat); return;
  }
  emptyChat.style.display = 'none';

  let msgs;
  if (activeChatType === 'group') {
    msgs = allGroupMessages[activeContact] || [];
  } else {
    msgs = allMessages.filter(function(m) {
      return (m.fromId === activeContact && m.toId === myId) || (m.fromId === myId && m.toId === activeContact);
    });
  }

  let html = '', lastDate = '';
  msgs.forEach(function(m) {
    const d = new Date(m.ts);
    const dateStr = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    if (dateStr !== lastDate) { html += '<div class="date-divider"><span>' + dateStr + '</span></div>'; lastDate = dateStr; }
    const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const isMe = m.fromId === myId;
    const senderName = m.fromName || '';
    const senderNameLower = senderName.toLowerCase();
    const senderAvatar = isMe ? myAvatar : (onlineUsers[senderNameLower] ? onlineUsers[senderNameLower].avatar : null);
    html += '<div class="msg-row ' + (isMe ? 'me' : 'other') + '">';
    if (!isMe) {
      html += '<div class="msg-avatar">';
      if (senderAvatar && senderAvatar.type === 'image' && senderAvatar.value) html += '<img src="' + senderAvatar.value + '" alt="">';
      else if (senderAvatar && senderAvatar.type === 'emoji') html += senderAvatar.value;
      else html += '<span>' + getInitials(senderName) + '</span>';
      html += '</div>';
    }
    html += '<div><div class="msg-bubble">' + escapeHtml(m.text) + '</div>';
    html += '<div class="msg-meta">';
    if (!isMe && activeChatType === 'group') html += '<span class="sender">' + escapeHtml(senderName) + '</span>';
    html += '<span class="time">' + timeStr + '</span></div></div></div>';
  });
  container.innerHTML = html;
  container.appendChild(emptyChat);
  if (msgs.length === 0) emptyChat.style.display = 'flex';
  container.scrollTop = container.scrollHeight;
}

function updateChatHeader() {
  const nameEl = document.getElementById('chatName');
  const statusEl = document.getElementById('chatStatus');
  const avatarEl = document.getElementById('chatAvatar');
  const input = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const delBtn = document.getElementById('deleteFriendBtn');
  const giBtn = document.getElementById('groupInfoBtn');

  if (!activeContact) {
    nameEl.textContent = '\u9009\u62E9\u8054\u7CFB\u4EBA'; statusEl.textContent = ''; statusEl.className = 'chat-status';
    avatarEl.style.background = '#94a3b8'; avatarEl.innerHTML = '?';
    input.disabled = true; input.placeholder = '\u9009\u62E9\u4E00\u4E2A\u597D\u53CB\u6216\u7FA4\u804A\u5F00\u59CB\u804A\u5929';
    sendBtn.disabled = true; delBtn.style.display = 'none'; giBtn.style.display = 'none';
    return;
  }

  if (activeChatType === 'group') {
    const group = myGroups[activeContact];
    const name = group ? group.name : '\u672A\u77E5\u7FA4';
    nameEl.textContent = name;
    statusEl.textContent = (group ? Object.keys(group.members).length : 0) + ' \u4EBA';
    statusEl.className = 'chat-status';
    avatarEl.style.background = 'var(--online)'; avatarEl.innerHTML = '\u{1F465}';
    input.disabled = false; input.placeholder = '\u8F93\u5165\u7FA4\u6D88\u606F...';
    sendBtn.disabled = false; delBtn.style.display = 'none'; giBtn.style.display = 'inline-block';
  } else {
    const friend = myFriends[activeContact];
    const name = friend ? friend.name : '';
    const u = onlineUsers[activeContact];
    const online = !!u;
    const avatar = u ? u.avatar : null;
    nameEl.textContent = name || '\u672A\u77E5';
    statusEl.textContent = online ? '\u5728\u7EBF' : '\u79BB\u7EBF';
    statusEl.className = 'chat-status ' + (online ? 'online' : 'offline');
    renderAvatar(avatarEl, avatar, name, 'sm');
    input.disabled = false; input.placeholder = '\u8F93\u5165\u6D88\u606F...';
    sendBtn.disabled = false; delBtn.style.display = 'inline-block'; giBtn.style.display = 'none';
  }
  input.focus();
}

function updateOnlineCount() {
  let count = 0;
  for (const nameLower in myFriends) {
    if (onlineUsers[nameLower]) count++;
  }
  document.getElementById('onlineCount').textContent = count + ' \u597D\u53CB\u5728\u7EBF';
}

function selectContact(id, name, type) {
  activeContact = id;
  activeChatType = type || 'friend';
  if (type === 'group') markGroupRead(id);
  else markRead(id);
  renderContacts();
  renderMessages();
  updateChatHeader();
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('momentsPanel').classList.add('hidden');
  document.getElementById('groupInfoPanel').classList.add('hidden');
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.add('hidden-mobile');
}

function showSidebar() {
  document.getElementById('sidebar').classList.remove('hidden-mobile');
}

function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !activeContact) return;
  if (activeChatType === 'group') {
    send({ type: 'group_chat', groupId: activeContact, text });
  } else {
    send({ type: 'chat', toId: activeContact, toNameLower: activeContact, text });
  }
  input.value = ''; input.style.height = 'auto';
  input.focus();
}

function doLogout() {
  if (ws) { send({ type: 'leave' }); ws.close(); }
  clearInterval(heartbeatInterval);
  localStorage.removeItem('bc_remember');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('loginName').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('rememberMe').checked = false;
  resetState();
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 2500);
}
function escapeHtml(str) {
  const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
}
function escapeHtmlAttr(str) {
  return str.replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
}

window.addEventListener('beforeunload', function() { if (ws && myId) send({ type: 'leave' }); });
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && myId && ws && ws.readyState === WebSocket.OPEN) {
    send({ type: 'heartbeat' });
  }
});

init();
<\/script>
<script>
// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function() {});
}
<\/script>
</body>
</html>`;
  var INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#6c5ce7">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Basic">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable" content="yes">
<title>Basic \u2014 \u7B80\u5355\u5373\u5F3A\u5927</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;line-height:1.7;color:var(--ink);background:var(--bg);overflow-x:hidden}
:root{--bg:#0a0a0f;--bg2:#12121a;--bg3:#1a1a26;--ink:#e8e8f0;--muted:#8888a0;--rule:#1e1e30;--accent:#6c5ce7;--accent2:#00cec9;--accent3:#fd79a8;--radius:16px;--radius-sm:10px;--shadow:0 2px 8px rgba(0,0,0,0.3);--shadow-lg:0 20px 60px rgba(0,0,0,0.5)}
body::before{content:'';position:fixed;top:-40%;left:-30%;width:80%;height:80%;background:radial-gradient(circle,rgba(108,92,231,0.08) 0%,transparent 70%);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;bottom:-30%;right:-25%;width:70%;height:70%;background:radial-gradient(circle,rgba(0,206,201,0.06) 0%,transparent 70%);pointer-events:none;z-index:0}
.container{max-width:1100px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
nav{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(108,92,231,0.12)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 0;max-width:1100px;margin:0 auto;padding-left:24px;padding-right:24px}
.nav-logo{font-size:22px;font-weight:900;color:#fff;display:flex;align-items:center;gap:10px;text-decoration:none;letter-spacing:-0.03em}
.nav-logo .dot{width:34px;height:34px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff}
.nav-links{display:flex;gap:28px;list-style:none;align-items:center}
.nav-links a{text-decoration:none;color:var(--muted);font-size:14px;font-weight:500;transition:color 0.2s}
.nav-links a:hover{color:#fff}
.nav-cta{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff!important;padding:9px 22px;border-radius:22px;font-weight:700;font-size:14px;transition:all 0.25s}
.nav-cta:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(108,92,231,0.4)}
.hero{padding:100px 0 80px;text-align:center}
.hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(108,92,231,0.12);border:1px solid rgba(108,92,231,0.2);color:var(--accent);font-size:13px;font-weight:600;padding:8px 18px;border-radius:24px;margin-bottom:28px;letter-spacing:0.3px}
.hero-badge .blink{width:7px;height:7px;background:var(--accent2);border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 6px var(--accent2)}50%{opacity:0.4;box-shadow:0 0 2px var(--accent2)}}
.hero h1{font-size:clamp(38px,7vw,64px);font-weight:900;line-height:1.1;margin-bottom:20px;letter-spacing:-0.03em;color:#fff}
.hero h1 .gradient{background:linear-gradient(135deg,var(--accent),var(--accent2),var(--accent3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero p{font-size:18px;color:var(--muted);max-width:600px;margin:0 auto 40px;line-height:1.8}
.hero-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn{padding:15px 36px;border-radius:28px;font-size:16px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all 0.25s;border:none;cursor:pointer;font-family:inherit}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 4px 24px rgba(108,92,231,0.35)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(108,92,231,0.5)}
.btn-outline{background:transparent;color:var(--ink);border:2px solid var(--rule)}
.btn-outline:hover{border-color:var(--accent);color:#fff;transform:translateY(-2px)}
.products{padding:80px 0}
.section-label{text-align:center;font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
.section-title{text-align:center;font-size:clamp(28px,4vw,40px);font-weight:900;margin-bottom:16px;letter-spacing:-0.01em;color:#fff}
.section-sub{text-align:center;color:var(--muted);font-size:16px;max-width:520px;margin:0 auto 60px;line-height:1.8}
.product-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
.product-card{background:var(--bg2);border:1px solid var(--rule);border-radius:var(--radius);padding:40px 32px;transition:all 0.35s;position:relative;overflow:hidden;text-decoration:none;display:block;color:inherit}
.product-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent2));opacity:0;transition:opacity 0.35s}
.product-card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg);border-color:rgba(108,92,231,0.3)}
.product-card:hover::before{opacity:1}
.product-icon{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:24px}
.pc-1{background:linear-gradient(135deg,rgba(108,92,231,0.2),rgba(108,92,231,0.1));color:var(--accent)}
.pc-2{background:linear-gradient(135deg,rgba(0,206,201,0.2),rgba(0,206,201,0.1));color:var(--accent2)}
.pc-3{background:linear-gradient(135deg,rgba(253,121,168,0.2),rgba(253,121,168,0.1));color:var(--accent3)}
.product-card h3{font-size:22px;font-weight:800;margin-bottom:10px;color:#fff;letter-spacing:-0.01em}
.product-card p{font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:16px}
.product-card .tag-row{display:flex;gap:8px;flex-wrap:wrap}
.tag{display:inline-block;font-size:11px;font-weight:600;padding:4px 10px;border-radius:14px;background:rgba(108,92,231,0.1);color:var(--accent);border:1px solid rgba(108,92,231,0.15)}
.tag.green{background:rgba(0,206,201,0.1);color:var(--accent2);border-color:rgba(0,206,201,0.15)}
.tag.pink{background:rgba(253,121,168,0.1);color:var(--accent3);border-color:rgba(253,121,168,0.15)}
.product-card .arrow{position:absolute;bottom:32px;right:32px;width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--muted);transition:all 0.35s}
.product-card:hover .arrow{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.features{padding:80px 0;background:var(--bg2);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0}
.feature-item{text-align:center;padding:40px 32px;border-right:1px solid var(--rule)}
.feature-item:last-child{border-right:none}
.feature-num{font-size:48px;font-weight:900;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1;margin-bottom:8px}
.feature-item h4{font-size:16px;font-weight:700;color:#fff;margin-bottom:6px}
.feature-item p{font-size:13px;color:var(--muted);line-height:1.6}
.links{padding:80px 0}
.link-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}
.link-card{background:var(--bg2);border:1px solid var(--rule);border-radius:var(--radius);padding:28px;text-align:center;text-decoration:none;color:inherit;transition:all 0.3s}
.link-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg);border-color:rgba(108,92,231,0.25)}
.link-card .icon{font-size:32px;margin-bottom:12px;display:block}
.link-card h4{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px}
.link-card span{font-size:12px;color:var(--muted)}
.cta-section{padding:80px 0;text-align:center}
.cta-card{background:linear-gradient(135deg,rgba(108,92,231,0.08),rgba(0,206,201,0.06));border:1px solid rgba(108,92,231,0.15);border-radius:var(--radius);padding:56px 40px;max-width:640px;margin:0 auto}
.cta-card h2{font-size:30px;font-weight:900;margin-bottom:12px;letter-spacing:-0.01em;color:#fff}
.cta-card p{color:var(--muted);font-size:16px;margin-bottom:32px;line-height:1.7}
.cta-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
footer{background:var(--bg2);padding:48px 0;border-top:1px solid var(--rule);text-align:center}
.footer-brand{font-size:20px;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-0.02em}
.footer-slogan{font-size:13px;color:var(--muted);margin-bottom:20px}
.footer-links{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}
.footer-links a{color:var(--muted);text-decoration:none;font-size:14px;transition:color 0.2s}
.footer-links a:hover{color:var(--accent)}
.footer-copy{font-size:12px;color:var(--muted);opacity:0.6}
@media(max-width:768px){
.hero{padding:60px 0 50px}.hero h1{font-size:32px}.hero p{font-size:15px}.nav-links{display:none}
.products{padding:50px 0}.features{padding:50px 0}.links{padding:50px 0}.cta-section{padding:50px 0}
.feature-grid{grid-template-columns:1fr}.feature-item{border-right:none;border-bottom:1px solid var(--rule);padding:28px}
.feature-item:last-child{border-bottom:none}.product-grid{grid-template-columns:1fr}.product-card{padding:28px 24px}
.cta-card{padding:36px 24px}.cta-card h2{font-size:24px}
}
</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <a href="#" class="nav-logo"><div class="dot">B</div>Basic</a>
    <ul class="nav-links">
      <li><a href="#products">\u4EA7\u54C1</a></li>
      <li><a href="#features">\u4F18\u52BF</a></li>
      <li><a href="#links">\u8D44\u6E90</a></li>
      <li><a href="https://github.com/HuHuBasic" target="_blank">GitHub</a></li>
      <li><a href="/chat" class="nav-cta">\u5F00\u59CB\u804A\u5929</a></li>
    </ul>
  </div>
</nav>
<section class="hero">
  <div class="container">
    <div class="hero-badge"><span class="blink"></span>Basic \u751F\u6001 \xB7 \u6301\u7EED\u66F4\u65B0\u4E2D</div>
    <h1>\u7B80\u5355\u5373\u5F3A\u5927<br><span class="gradient">Basic \u8BA9\u4E00\u5207\u56DE\u5F52\u672C\u8D28</span></h1>
    <p>Basic \u662F\u4E00\u7CFB\u5217\u8F7B\u91CF\u7EA7\u3001\u5F00\u6E90\u3001\u8DE8\u5E73\u53F0\u5DE5\u5177\u7684\u96C6\u5408\u3002\u4ECE\u5B9E\u65F6\u804A\u5929\u5230\u64CD\u4F5C\u7CFB\u7EDF\uFF0C\u6211\u4EEC\u7528\u6700\u7B80\u5355\u7684\u8BBE\u8BA1\uFF0C\u505A\u6700\u5B9E\u7528\u7684\u4EA7\u54C1\u3002</p>
    <div class="hero-buttons">
      <a href="/chat" class="btn btn-primary">\u{1F680} \u7ACB\u5373\u4F53\u9A8C</a>
      <a href="https://github.com/HuHuBasic" target="_blank" class="btn btn-outline">\u67E5\u770B GitHub \u2197</a>
    </div>
  </div>
</section>
<section class="products" id="products">
  <div class="container">
    <div class="section-label">\u4EA7\u54C1\u77E9\u9635</div>
    <h2 class="section-title">\u63A2\u7D22 Basic \u751F\u6001</h2>
    <p class="section-sub">\u6BCF\u4E2A\u4EA7\u54C1\u90FD\u79C9\u627F"\u7B80\u5355\u5373\u5F3A\u5927"\u7684\u7406\u5FF5\uFF0C\u4E13\u6CE8\u505A\u597D\u4E00\u4EF6\u4E8B\u3002</p>
    <div class="product-grid">
      <a href="/chat" class="product-card">
        <div class="product-icon pc-1">\u{1F4AC}</div>
        <h3>Basic Chatting</h3>
        <p>\u8DE8\u8BBE\u5907\u5B9E\u65F6\u804A\u5929\u5E73\u53F0\u3002\u652F\u6301\u5934\u50CF\u3001\u52A8\u6001\u3001\u7FA4\u804A\u3001\u5BC6\u7801\u4FDD\u62A4\uFF0C\u57FA\u4E8E WebSocket \u6280\u672F\uFF0C\u6D88\u606F\u5373\u65F6\u9001\u8FBE\u3002</p>
        <div class="tag-row"><span class="tag">\u5B9E\u65F6\u901A\u4FE1</span><span class="tag">WebSocket</span><span class="tag green">\u514D\u8D39\u5F00\u6E90</span></div>
        <div class="arrow">\u2192</div>
      </a>
      <a href="https://huhubasic.github.io/basic-kernel" target="_blank" class="product-card">
        <div class="product-icon pc-2">\u{1F5A5}\uFE0F</div>
        <h3>HU basic OS</h3>
        <p>\u771F\u6B63\u7684 x86 \u64CD\u4F5C\u7CFB\u7EDF\u5185\u6838\u3002\u56FE\u5F62\u5316\u684C\u9762\u73AF\u5883\uFF0C\u652F\u6301\u9F20\u6807\u64CD\u4F5C\u3002\u63D0\u4F9B 64 \u4F4D\u300132 \u4F4D\u300164+32 \u4F4D\u517C\u5BB9\u4E09\u4E2A\u7248\u672C\uFF0C\u901A\u8FC7 GRUB \u5F15\u5BFC\uFF0C\u53EF\u8FD0\u884C\u5728\u771F\u5B9E\u786C\u4EF6\u6216\u865A\u62DF\u673A\u4E0A\u3002</p>
        <div class="tag-row"><span class="tag green">64 \u4F4D</span><span class="tag green">32 \u4F4D</span><span class="tag green">64+32</span><span class="tag">\u56FE\u5F62\u5316</span><span class="tag">\u5F00\u6E90</span></div>
        <div class="arrow">\u2192</div>
      </a>
      <a href="https://github.com/HuHuBasic" target="_blank" class="product-card">
        <div class="product-icon pc-3">\u{1F527}</div>
        <h3>\u66F4\u591A\u9879\u76EE</h3>
        <p>Basic \u751F\u6001\u6301\u7EED\u6269\u5C55\u4E2D\u3002\u6B22\u8FCE\u8BBF\u95EE GitHub \u4E86\u89E3\u66F4\u591A\u9879\u76EE\uFF0C\u6216\u53C2\u4E0E\u8D21\u732E\u3002</p>
        <div class="tag-row"><span class="tag pink">\u5373\u5C06\u63A8\u51FA</span><span class="tag">\u5F00\u6E90</span><span class="tag green">\u534F\u4F5C</span></div>
        <div class="arrow">\u2192</div>
      </a>
    </div>
  </div>
</section>
<section class="features" id="features">
  <div class="container">
    <div class="section-label">\u4E3A\u4EC0\u4E48\u9009\u62E9 Basic</div>
    <h2 class="section-title">\u6211\u4EEC\u7684\u7406\u5FF5</h2>
    <p class="section-sub">\u4E0D\u5806\u780C\u529F\u80FD\uFF0C\u53EA\u505A\u6838\u5FC3\u3002\u6BCF\u4E00\u4E2A\u4EA7\u54C1\u90FD\u529B\u6C42\u7B80\u5355\u3001\u5FEB\u901F\u3001\u53EF\u9760\u3002</p>
    <div class="feature-grid">
      <div class="feature-item"><div class="feature-num">100%</div><h4>\u514D\u8D39\u5F00\u6E90</h4><p>\u6240\u6709\u4EE3\u7801\u516C\u5F00\u5728 GitHub\uFF0C\u65E0\u9700\u4ED8\u8D39\uFF0C\u81EA\u7531\u4F7F\u7528\u548C\u4FEE\u6539</p></div>
      <div class="feature-item"><div class="feature-num">0</div><h4>\u4E0B\u8F7D\u5B89\u88C5</h4><p>\u6253\u5F00\u6D4F\u89C8\u5668\u5373\u53EF\u4F7F\u7528\uFF0C\u65E0\u9700\u5B89\u88C5\u4EFB\u4F55\u8F6F\u4EF6\u6216\u63D2\u4EF6</p></div>
      <div class="feature-item"><div class="feature-num">\u5B9E\u65F6</div><h4>\u6D88\u606F\u540C\u6B65</h4><p>WebSocket \u9A71\u52A8\u7684\u5373\u65F6\u901A\u4FE1\uFF0C\u6D88\u606F\u6BEB\u79D2\u7EA7\u9001\u8FBE</p></div>
      <div class="feature-item"><div class="feature-num">\u5168\u5E73\u53F0</div><h4>\u8DE8\u8BBE\u5907\u652F\u6301</h4><p>\u624B\u673A\u3001\u5E73\u677F\u3001\u7535\u8111\uFF0C\u4EFB\u4F55\u8BBE\u5907\u90FD\u80FD\u65E0\u7F1D\u4F7F\u7528</p></div>
      <div class="feature-item"><div class="feature-num">64+32</div><h4>64 \u4F4D\u8F6F\u4EF6</h4><p>\u540C\u65F6\u517C\u5BB9 64 \u4F4D\u4E0E 32 \u4F4D\u67B6\u6784\uFF0C64 \u4F4D\u8F6F\u4EF6\u539F\u751F\u8FD0\u884C\uFF0C\u6027\u80FD\u66F4\u5F3A\u52B2</p></div>
    </div>
  </div>
</section>
<section class="links" id="links">
  <div class="container">
    <div class="section-label">\u5FEB\u901F\u94FE\u63A5</div>
    <h2 class="section-title">\u8D44\u6E90\u4E0E\u5165\u53E3</h2>
    <p class="section-sub">\u5FEB\u901F\u8BBF\u95EE Basic \u751F\u6001\u7684\u5404\u4E2A\u5165\u53E3\u3002</p>
    <div class="link-grid">
      <a href="/chat" class="link-card"><span class="icon">\u{1F4AC}</span><h4>Basic Chatting</h4><span>\u5F00\u59CB\u804A\u5929</span></a>
      <a href="https://huhubasic.github.io/basic-kernel" target="_blank" class="link-card"><span class="icon">\u{1F5A5}\uFE0F</span><h4>HU basic OS</h4><span>\u5728\u7EBF\u4F53\u9A8C</span></a>
      <a href="https://github.com/HuHuBasic/basic-chatting" target="_blank" class="link-card"><span class="icon">\u{1F4E6}</span><h4>Chatting \u6E90\u7801</h4><span>GitHub</span></a>
      <a href="https://github.com/HuHuBasic" target="_blank" class="link-card"><span class="icon">\u{1F419}</span><h4>HuHuBasic</h4><span>GitHub \u4E3B\u9875</span></a>
    </div>
  </div>
</section>
<section class="cta-section">
  <div class="container">
    <div class="cta-card">
      <h2>\u51C6\u5907\u597D\u5F00\u59CB\u4E86\u5417\uFF1F</h2>
      <p>\u6253\u5F00\u6D4F\u89C8\u5668\uFF0C\u6CE8\u518C\u8D26\u53F7\uFF0C\u5373\u523B\u4F53\u9A8C\u8DE8\u8BBE\u5907\u5B9E\u65F6\u804A\u5929\u7684\u4E50\u8DA3\u3002\u5B8C\u5168\u514D\u8D39\uFF0C\u65E0\u9700\u4E0B\u8F7D\u3002</p>
      <div class="cta-buttons">
        <a href="/chat" class="btn btn-primary">\u{1F680} \u7ACB\u5373\u4F53\u9A8C</a>
        <a href="https://github.com/HuHuBasic" target="_blank" class="btn btn-outline">\u2B50 Star on GitHub</a>
      </div>
    </div>
  </div>
</section>
<footer>
  <div class="container">
    <div class="footer-brand">Basic</div>
    <div class="footer-slogan">\u7B80\u5355\u5373\u5F3A\u5927 \xB7 \u5F00\u6E90\u514D\u8D39 \xB7 \u53EA\u4E3A\u66F4\u597D</div>
    <div class="footer-links">
      <a href="/chat">\u{1F4AC} \u804A\u5929</a>
      <a href="https://huhubasic.github.io/basic-kernel" target="_blank">\u{1F5A5}\uFE0F Basic OS</a>
      <a href="https://github.com/HuHuBasic/basic-chatting" target="_blank">\u{1F4E6} \u6E90\u7801</a>
      <a href="https://github.com/HuHuBasic" target="_blank">\u{1F419} GitHub</a>
    </div>
    <p class="footer-copy">&copy; 2026 Basic. Made with \u2764\uFE0F by HuHuBasic. \u7B80\u5355\u5373\u5F3A\u5927.</p>
  </div>
</footer>
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function(){});
}
<\/script>
</body>
</html>`;
  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });
  async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      server.addEventListener("message", (event) => {
        handleMessage(server, event.data);
      });
      server.addEventListener("close", () => {
        disconnectClient(server);
      });
      server.addEventListener("error", () => {
        disconnectClient(server);
      });
      return new Response(null, { status: 101, webSocket: client });
    }
    if (path === "/chat" || path === "/chat.html") {
      return new Response(CHAT_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    if (path === "/" || path === "/index.html") {
      return new Response(INDEX_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    const targetUrl = TARGET + path + url.search;
    const headers = new Headers(request.headers);
    headers.set("Host", TARGET_HOST);
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "follow"
    });
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
    modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    modifiedResponse.headers.set("Access-Control-Allow-Headers", "*");
    return modifiedResponse;
  }
  __name(handleRequest, "handleRequest");
})();
//# sourceMappingURL=cloudflare-worker.js.map
