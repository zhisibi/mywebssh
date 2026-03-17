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

// WebSocket SSH 连接
wss.on('connection', (ws, req) => {
  console.log('🔌 WebSocket 客户端连接建立');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 收到 WebSocket 消息:', message.type);
      
      if (message.type === 'connect') {
        const server = config.servers.find(s => s.id === message.serverId);
        if (!server) {
          console.log('❌ 服务器不存在，ID:', message.serverId);
          ws.send(JSON.stringify({ type: 'error', message: '服务器不存在' }));
          return;
        }

        console.log('🔗 开始连接 SSH 服务器:', server.host);
        
        const sshConfig = {
          host: server.host,
          port: server.port || 22,
          username: server.username,
          readyTimeout: 10000, // 10秒超时
          debug: console.log // 启用 SSH 调试
        };

        if (server.authType === 'password' && server.password) {
          sshConfig.password = server.password;
          console.log('🔑 使用密码认证');
        } else if (server.authType === 'key' && server.privateKey) {
          sshConfig.privateKey = server.privateKey;
          console.log('🔑 使用密钥认证');
        }

        connectSSH(ws, sshConfig);
      }
    } catch (error) {
      console.log('❌ WebSocket 消息解析错误:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket 连接关闭');
  });

  ws.on('error', (error) => {
    console.log('❌ WebSocket 错误:', error.message);
  });
});

function connectSSH(ws, sshConfig) {
  const conn = new Client();

  conn.on('ready', () => {
    console.log('✅ SSH 连接就绪');
    ws.send(JSON.stringify({ type: 'connected', message: 'SSH连接成功' }));

    conn.shell((err, stream) => {
      if (err) {
        console.log('❌ SSH Shell 错误:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: 'SSH SHELL ERROR: ' + err.message }));
        ws.close();
        conn.end();
        return;
      }

      console.log('🚀 SSH Shell 已启动');

      // SSH → 浏览器
      stream.on('data', (data) => {
        ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
      });

      stream.on('close', () => {
        console.log('🔌 SSH Stream 关闭');
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
        } catch (e) {
          console.log('❌ 输入消息解析错误');
        }
      });
    });
  });

  conn.on('error', (err) => {
    console.log('❌ SSH 连接错误:', err.message);
    try {
      ws.send(JSON.stringify({ type: 'error', message: 'SSH连接错误: ' + err.message }));
    } catch (e) {}
    ws.close();
  });

  conn.on('end', () => {
    console.log('🔌 SSH 连接结束');
    ws.close();
  });

  conn.on('close', () => {
    console.log('🔌 SSH 连接关闭');
    ws.close();
  });

  console.log('🔄 开始 SSH 连接...');
  conn.connect(sshConfig);
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.log('❌ 加载配置文件失败，使用默认配置');
    return {
      admin: { username: 'admin', password: 'admin123' },
      servers: [],
      port: 3000
    };
  }
}

const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`🚀 WebSSH 服务器运行在端口 ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`🔑 默认管理员账号: ${config.admin.username} / ${config.admin.password}`);
  console.log('');
  console.log('📋 当前服务器配置:');
  config.servers.forEach(server => {
    console.log(`   • ${server.name}: ${server.username}@${server.host}:${server.port}`);
  });
});