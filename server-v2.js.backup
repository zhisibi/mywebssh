const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 配置文件
const configPath = path.join(__dirname, 'config.json');
let config = loadConfig();

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.admin.username && password === config.admin.password) {
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

app.get('/api/servers', (req, res) => {
  res.json(config.servers.filter(server => server.enabled));
});

app.post('/api/servers', (req, res) => {
  const newServer = {
    id: Date.now(),
    ...req.body,
    enabled: true
  };
  config.servers.push(newServer);
  saveConfig();
  res.json({ success: true, server: newServer });
});

app.put('/api/servers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = config.servers.findIndex(s => s.id === id);
  if (index !== -1) {
    config.servers[index] = { ...config.servers[index], ...req.body };
    saveConfig();
    res.json({ success: true, server: config.servers[index] });
  } else {
    res.status(404).json({ success: false, message: '服务器不存在' });
  }
});

app.delete('/api/servers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = config.servers.findIndex(s => s.id === id);
  if (index !== -1) {
    config.servers.splice(index, 1);
    saveConfig();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: '服务器不存在' });
  }
});

// WebSocket SSH 连接
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'connect') {
        const server = config.servers.find(s => s.id === message.serverId);
        if (!server) {
          ws.send(JSON.stringify({ type: 'error', message: '服务器不存在' }));
          return;
        }

        const sshConfig = {
          host: server.host,
          port: server.port || 22,
          username: server.username
        };

        if (server.authType === 'password' && server.password) {
          sshConfig.password = server.password;
        } else if (server.authType === 'key' && server.privateKey) {
          sshConfig.privateKey = server.privateKey;
        }

        connectSSH(ws, sshConfig);
      }
    } catch (error) {
      console.log('WebSocket message error:', error.message);
    }
  });
});

function connectSSH(ws, sshConfig) {
  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection ready');
    ws.send(JSON.stringify({ type: 'connected', message: 'SSH连接成功' }));

    conn.shell((err, stream) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'SSH SHELL ERROR: ' + err.message }));
        ws.close();
        conn.end();
        return;
      }

      // SSH → 浏览器
      stream.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
      });

      stream.on('close', () => {
        console.log('SSH stream closed');
        ws.send(JSON.stringify({ type: 'close', message: 'SSH连接已关闭' }));
        ws.close();
        conn.end();
      });

      // 浏览器 → SSH
      ws.on('message', (msg) => {
        try {
          const message = JSON.parse(msg);
          if (message.type === 'input') {
            stream.write(message.data);
          }
        } catch (e) {}
      });
    });
  });

  conn.on('error', (err) => {
    console.log('SSH connection error:', err.message);
    ws.send(JSON.stringify({ type: 'error', message: 'SSH连接错误: ' + err.message }));
    ws.close();
  });

  conn.on('close', () => {
    console.log('SSH connection closed');
    ws.close();
  });

  conn.connect(sshConfig);
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.log('加载配置文件失败，使用默认配置');
    return {
      admin: { username: 'admin', password: 'admin123' },
      servers: [],
      port: 3000
    };
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.log('保存配置文件失败:', error.message);
  }
}

const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`WebSSH服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
  console.log(`默认管理员账号: ${config.admin.username} / ${config.admin.password}`);
});