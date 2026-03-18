const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server });

// 配置文件
const configPath = path.join(__dirname, 'config.json');
const configKeyPath = path.join(__dirname, '.key'); // 加密密钥文件

// ============ 安全模块 ============

// 硬编码密钥（生产环境建议使用环境变量）
const FIXED_KEY = 'webssh-secure-key-2024-32bytes!';
const FIXED_KEY_32 = FIXED_KEY.padEnd(32, '0').slice(0, 32);

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', FIXED_KEY_32, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', FIXED_KEY_32, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.log('解密失败:', e.message);
    return '';
  }
}

// 生成安全 token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 安全哈希（用于密码验证）
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ============ 配置加载/保存（自动加密） ============

let config = loadConfig();

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      // 解密敏感字段
      return decryptConfig(parsed);
    }
  } catch (e) {
    console.error('加载配置失败:', e.message);
  }
  return { admin: { username: 'admin', password: 'admin123' }, servers: [], port: 3000 };
}

function decryptConfig(cfg) {
  // 解密管理员密码（如果是非加密格式，转换为加密）
  if (cfg.admin && cfg.admin.password && !cfg.admin.password.includes(':')) {
    cfg.admin.password = encrypt(cfg.admin.password);
  }
  
  // 加密服务器敏感信息（旧格式转换）
  if (cfg.servers) {
    cfg.servers = cfg.servers.map(s => {
      // 加密 host（IP 或域名）
      if (s.host && !s.host.includes(':')) {
        // 兼容旧格式
        s._host = s.host;
      } else if (s.host) {
        s._host = decrypt(s.host);
      }
      // 加密 port
      if (s.port && !String(s.port).includes(':')) {
        s._port = s.port;
      } else if (s.port) {
        s._port = parseInt(decrypt(String(s.port))) || 22;
      }
      // 加密 username
      if (s.username && !s.username.includes(':')) {
        s._username = s.username;
      } else if (s.username) {
        s._username = decrypt(s.username);
      }
      // 加密 password
      if (s.password && !s.password.includes(':')) {
        s.password = encrypt(s.password);
      }
      // 加密 privateKey
      if (s.privateKey && !s.privateKey.includes(':')) {
        s.privateKey = encrypt(s.privateKey);
      }
      // 加密 passphrase
      if (s.passphrase && !s.passphrase.includes(':')) {
        s.passphrase = encrypt(s.passphrase);
      }
      return s;
    });
  }
  return cfg;
}

function saveConfig() {
  try {
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, data, 'utf8');
  } catch (e) {
    console.error('保存配置失败:', e.message);
  }
}

// 会话管理
const sessions = new Map();

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 会话验证中间件
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }
  const session = sessions.get(token);
  // 检查会话过期（30分钟无活动）
  if (Date.now() - session.lastActive > 30 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ success: false, message: '会话已过期' });
  }
  session.lastActive = Date.now();
  sessions.set(token, session);
  req.session = session;
  req.token = token;
  next();
}

// ============ API 路由 ============

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // 尝试解密密码进行验证
  let storedPassword = decrypt(config.admin.password);
  
  // 如果解密失败或结果为空，尝试直接匹配（明文密码）
  if (!storedPassword) {
    storedPassword = config.admin.password;
  }
  
  if (username === config.admin.username && password === storedPassword) {
    const token = generateToken();
    sessions.set(token, {
      username,
      createdAt: Date.now(),
      lastActive: Date.now(),
      ip: req.ip
    });
    console.log(`[安全] 用户 ${username} 登录成功，IP: ${req.ip}`);
    res.json({ success: true, message: '登录成功', token });
  } else {
    console.log(`[安全] 登录失败，用户: ${username}, IP: ${req.ip}`);
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// 登出
app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    sessions.delete(token);
    console.log(`[安全] 用户 ${req.session.username} 退出登录`);
  }
  res.json({ success: true, message: '已退出登录' });
});

// 修改管理员密码
app.post('/api/admin/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword, currentPassword, password } = req.body;
  
  // 兼容多种参数名
  const currentPwd = oldPassword || currentPassword || password;
  const newPwd = newPassword;
  
  if (!currentPwd || !newPwd) {
    return res.status(400).json({ success: false, message: '请提供当前密码和新密码' });
  }
  
  // 验证当前密码
  const storedPassword = decrypt(config.admin.password);
  
  if (currentPwd !== storedPassword) {
    return res.status(400).json({ success: false, message: '当前密码错误' });
  }
  
  if (newPwd.length < 6) {
    return res.status(400).json({ success: false, message: '新密码至少需要6个字符' });
  }
  
  // 加密保存新密码
  config.admin.password = encrypt(newPwd);
  saveConfig();
  
  // 清除所有会话
  sessions.clear();
  console.log(`[安全] 用户 ${req.session.username} 修改了管理员密码`);
  
  res.json({ success: true, message: '密码修改成功，请重新登录' });
});

// 获取服务器列表
app.get('/api/servers', requireAuth, (req, res) => {
  const servers = config.servers
    .filter(server => server.enabled)
    .map(s => ({
      id: s.id,
      name: s.name,
      host: s._host || s.host,
      port: s._port || s.port,
      username: s._username || s.username,
      authType: s.authType,
      tags: s.tags,
      enabled: s.enabled
    }));
  res.json(servers);
});

// 添加服务器
app.post('/api/servers', requireAuth, (req, res) => {
  const { name, host, port, username, authType, password, privateKey, passphrase, tags } = req.body;
  
  if (!name || !host || !username) {
    return res.status(400).json({ success: false, message: '缺少必填项' });
  }
  
  const newServer = {
    id: Date.now(),
    name,
    // 加密存储敏感信息
    host: encrypt(host),
    _host: host,
    port: encrypt(String(port || 22)),
    _port: port || 22,
    username: encrypt(username),
    _username: username,
    authType: authType || 'password',
    tags: tags || [],
    enabled: true
  };
  
  if (password) {
    newServer.password = encrypt(password);
  }
  if (privateKey) {
    newServer.privateKey = encrypt(privateKey);
  }
  if (passphrase) {
    newServer.passphrase = encrypt(passphrase);
  }
  
  config.servers.push(newServer);
  saveConfig();
  
  console.log(`[安全] 用户 ${req.session.username} 添加了服务器: ${name}`);
  
  // 返回数据（显示 IP、端口、用户名）
  res.json({ 
    success: true, 
    server: { 
      id: newServer.id, 
      name, 
      host: host, 
      port: port || 22, 
      username: username, 
      authType: newServer.authType,
      tags: newServer.tags,
      enabled: true
    } 
  });
});

// 导入/恢复服务器（覆盖模式）
app.put('/api/servers/import', requireAuth, (req, res) => {
  const { servers } = req.body;
  
  if (!servers || !Array.isArray(servers)) {
    return res.status(400).json({ success: false, message: '无效的数据格式' });
  }
  
  // 加密并保存每个服务器
  const encryptedServers = servers.map(s => ({
    id: s.id || Date.now() + Math.random(),
    name: s.name,
    host: encrypt(s.host || ''),
    _host: s.host || '',
    port: encrypt(String(s.port || 22)),
    _port: s.port || 22,
    username: encrypt(s.username || ''),
    _username: s.username || '',
    authType: s.authType || 'password',
    password: s.password ? encrypt(s.password) : '',
    privateKey: s.privateKey ? encrypt(s.privateKey) : '',
    passphrase: s.passphrase ? encrypt(s.passphrase) : '',
    tags: s.tags || [],
    enabled: true
  }));
  
  config.servers = encryptedServers;
  saveConfig();
  
  console.log(`[安全] 用户 ${req.session.username} 导入了 ${servers.length} 个服务器`);
  
  res.json({ success: true, message: `成功导入 ${servers.length} 个服务器` });
});

// 更新服务器
app.put('/api/servers/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const index = config.servers.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: '服务器不存在' });
  }
  
  const { name, host, port, username, authType, password, privateKey, passphrase, tags } = req.body;
  
  if (name) config.servers[index].name = name;
  if (host) {
    config.servers[index].host = encrypt(host);
    config.servers[index]._host = host;
  }
  if (port) {
    config.servers[index].port = encrypt(String(port));
    config.servers[index]._port = port;
  }
  if (username) {
    config.servers[index].username = encrypt(username);
    config.servers[index]._username = username;
  }
  if (authType) config.servers[index].authType = authType;
  if (tags) config.servers[index].tags = tags;
  
  // 加密敏感信息
  if (password !== undefined) {
    config.servers[index].password = password ? encrypt(password) : '';
  }
  if (privateKey !== undefined) {
    config.servers[index].privateKey = privateKey ? encrypt(privateKey) : '';
  }
  if (passphrase !== undefined) {
    config.servers[index].passphrase = passphrase ? encrypt(passphrase) : '';
  }
  
  saveConfig();
  
  console.log(`[安全] 用户 ${req.session.username} 更新了服务器: ${config.servers[index].name}`);
  
  res.json({ 
    success: true, 
    server: { 
      id: config.servers[index].id,
      name: config.servers[index].name,
      host: config.servers[index]._host || config.servers[index].host,
      port: config.servers[index]._port || config.servers[index].port,
      username: config.servers[index]._username || config.servers[index].username,
      authType: config.servers[index].authType,
      tags: config.servers[index].tags,
      enabled: config.servers[index].enabled
    } 
  });
});

// 删除服务器
app.delete('/api/servers/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const index = config.servers.findIndex(s => s.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: '服务器不存在' });
  }
  
  const serverName = config.servers[index].name;
  config.servers.splice(index, 1);
  saveConfig();
  
  console.log(`[安全] 用户 ${req.session.username} 删除了服务器: ${serverName}`);
  
  res.json({ success: true, message: '删除成功' });
});

// 获取服务器完整信息（用于连接）
function getServerConfig(id) {
  const server = config.servers.find(s => s.id === id);
  if (!server) return null;
  
  // 兼容：优先使用解密后的明文（_开头），如果没有则解密
  let host = server._host;
  let port = server._port;
  let username = server._username;
  
  // 如果没有 _ 开头的明文，尝试解密
  if (!host && server.host) {
    host = server.host.includes(':') ? decrypt(server.host) : server.host;
  }
  if (!port && server.port) {
    port = typeof server.port === 'number' ? server.port : (server.port.includes(':') ? parseInt(decrypt(String(server.port))) : parseInt(server.port));
  }
  if (!username && server.username) {
    username = server.username.includes(':') ? decrypt(server.username) : server.username;
  }
  
  return {
    id: server.id,
    name: server.name,
    host: host,
    port: port,
    username: username,
    authType: server.authType,
    password: decrypt(server.password) || '',
    privateKey: decrypt(server.privateKey) || '',
    passphrase: decrypt(server.passphrase) || '',
    tags: server.tags,
    enabled: server.enabled
  };
}

// ============ SSH / SFTP WebSocket 处理 ============

// SSH 连接
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  let serverId = parseInt(url.searchParams.get('server'));
  let token = url.searchParams.get('token');
  
  // 等待客户端发送连接信息
  ws.once('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      
      // 从消息中获取参数（支持前端格式）
      if (data.token) token = data.token;
      if (data.serverId) serverId = data.serverId;
      
      // 验证会话
      if (!token || !sessions.has(token)) {
        ws.send(JSON.stringify({ type: 'error', data: '未授权' }));
        ws.close();
        return;
      }
      
      const session = sessions.get(token);
      const server = getServerConfig(serverId);
      
      if (!server) {
        ws.send(JSON.stringify({ type: 'error', data: '服务器不存在' }));
        ws.close();
        return;
      }
      
      console.log(`[SSH] 用户 ${session.username} 连接服务器: ${server.name} (${server.host})`);
      
      const conn = new Client();
      let shell = null;
      
      conn.on('ready', () => {
        // 发送连接成功消息
        ws.send(JSON.stringify({ type: 'connected', message: 'SSH连接已建立' }));
        
        conn.shell({ term: 'xterm-utf8' }, (err, stream) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'error', data: '打开终端失败: ' + err.message }));
            ws.close();
            return;
          }
          shell = stream;
          
          stream.on('data', (data) => {
            ws.send(JSON.stringify({ type: 'data', data: data.toString('base64') }));
          });
          
          stream.on('close', () => {
            ws.send(JSON.stringify({ type: 'close', data: '连接已关闭' }));
            ws.close();
          });
        });
      });
      
      conn.on('error', (err) => {
        console.error(`[SSH] 连接错误: ${err.message}`);
        ws.send(JSON.stringify({ type: 'error', data: '连接错误: ' + err.message }));
        ws.close();
      });
      
      // 建立 SSH 连接
      const connectConfig = {
        host: server.host,
        port: server.port || 22,
        username: server.username,
        readyTimeout: 10000
      };
      
      if (server.authType === 'key' && server.privateKey) {
        connectConfig.privateKey = server.privateKey;
        if (server.passphrase) {
          connectConfig.passphrase = server.passphrase;
        }
      } else {
        connectConfig.password = server.password;
      }
      
      conn.connect(connectConfig);
      
      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          if (msg.type === 'data' && shell) {
            const data = Buffer.from(msg.data, 'base64').toString();
            shell.write(data);
          }
          if (msg.type === 'resize') {
            if (shell) shell.setWindow(msg.rows, msg.cols, msg.height, msg.width);
          }
        } catch (e) {
          console.error('消息解析错误:', e);
        }
      });
      
      ws.on('close', () => {
        console.log(`[SSH] 用户 ${session.username} 断开连接: ${server.name}`);
        if (conn) conn.end();
      });
      
    } catch (e) {
      console.error('处理连接消息错误:', e);
      ws.send(JSON.stringify({ type: 'error', data: '连接失败' }));
      ws.close();
    }
  });
});

// ============ SFTP 接口 ============

// SFTP 列表
app.get('/api/sftp/list', requireAuth, (req, res) => {
  const { server: serverId, serverId: altServerId, path } = req.query;
  const id = parseInt(serverId || altServerId);
  const server = getServerConfig(id);
  
  if (!server) {
    return res.status(404).json({ error: '服务器不存在' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ error: err.message });
      }
      
      sftp.readdir(path || '/', (err, list) => {
        conn.end();
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const files = list.map(item => ({
          name: item.filename,
          isDirectory: item.attrs.isDirectory(),
          isSymbolicLink: item.attrs.isSymbolicLink(),
          size: item.attrs.size,
          modifyTime: Math.floor(item.attrs.mtime.getTime() / 1000)
        }));
        
        res.json(files);
      });
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 下载
app.get('/api/sftp/download', requireAuth, (req, res) => {
  const { server: serverId, path: filePath } = req.query;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server) {
    return res.status(404).json({ error: '服务器不存在' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ error: err.message });
      }
      
      const readStream = sftp.createReadStream(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      
      readStream.pipe(res);
      
      readStream.on('error', () => {
        conn.end();
      });
      
      res.on('close', () => {
        conn.end();
      });
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 上传
app.post('/api/sftp/upload', requireAuth, require('multer')().single('file'), (req, res) => {
  const { server: serverId, path: destPath } = req.body;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server || !req.file) {
    return res.status(400).json({ success: false, error: '参数错误' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ success: false, error: err.message });
      }
      
      const writeStream = sftp.createWriteStream(destPath + '/' + req.file.originalname);
      
      writeStream.on('close', () => {
        conn.end();
        res.json({ success: true, message: '上传成功' });
      });
      
      writeStream.on('error', (err) => {
        conn.end();
        res.status(500).json({ success: false, error: err.message });
      });
      
      writeStream.write(req.file.buffer);
      writeStream.end();
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 新建文件夹
app.post('/api/sftp/mkdir', requireAuth, (req, res) => {
  const { server: serverId, path } = req.body;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server) {
    return res.status(404).json({ success: false, error: '服务器不存在' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ success: false, error: err.message });
      }
      
      sftp.mkdir(path, (err) => {
        conn.end();
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
      });
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 删除
app.post('/api/sftp/delete', requireAuth, (req, res) => {
  const { server: serverId, path, isDirectory } = req.body;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server) {
    return res.status(404).json({ success: false, error: '服务器不存在' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ success: false, error: err.message });
      }
      
      if (isDirectory) {
        sftp.rmdir(path, (err) => {
          conn.end();
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          res.json({ success: true });
        });
      } else {
        sftp.unlink(path, (err) => {
          conn.end();
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          res.json({ success: true });
        });
      }
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 重命名
app.post('/api/sftp/rename', requireAuth, (req, res) => {
  const { server: serverId, oldPath, newPath } = req.body;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server) {
    return res.status(404).json({ success: false, error: '服务器不存在' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ success: false, error: err.message });
      }
      
      sftp.rename(oldPath, newPath, (err) => {
        conn.end();
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
      });
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// SFTP 批量下载
app.post('/api/sftp/download-batch', requireAuth, (req, res) => {
  const { server: serverId, paths } = req.body;
  const server = getServerConfig(parseInt(serverId));
  
  if (!server || !paths || paths.length === 0) {
    return res.status(400).json({ success: false, error: '参数错误' });
  }
  
  const conn = new Client();
  
  conn.on('ready', () => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end();
        return res.status(500).json({ success: false, error: err.message });
      }
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="files.zip"');
      archive.pipe(res);
      
      let completed = 0;
      paths.forEach(filePath => {
        sftp.readFile(filePath, (err, data) => {
          if (!err) {
            archive.append(data, { name: path.basename(filePath) });
          }
          completed++;
          if (completed === paths.length) {
            archive.finalize();
          }
        });
      });
      
      res.on('close', () => conn.end());
    });
  });
  
  const connectConfig = {
    host: server.host,
    port: server.port || 22,
    username: server.username
  };
  
  if (server.authType === 'key' && server.privateKey) {
    connectConfig.privateKey = server.privateKey;
    if (server.passphrase) connectConfig.passphrase = server.passphrase;
  } else {
    connectConfig.password = server.password;
  }
  
  conn.connect(connectConfig);
});

// 启动服务器
const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║         WebSSH 安全增强版已启动            ║
╠═══════════════════════════════════════════╣
║  地址: http://localhost:${PORT}              ║
║  加密: AES-256-GCM                          ║
║  会话: 30分钟自动过期                       ║
╚═══════════════════════════════════════════╝
  `);
});

// 定期清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.lastActive > 30 * 60 * 1000) {
      sessions.delete(token);
      console.log(`[安全] 清理过期会话: ${session.username}`);
    }
  }
}, 5 * 60 * 1000);
