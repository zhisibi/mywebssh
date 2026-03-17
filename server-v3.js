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

// SFTP API (开发中)
// SFTP 文件下载
app.get('/api/sftp/download', async (req, res) => {
  const { serverId, path: filePath } = req.query;
  
  try {
    const server = config.servers.find(s => s.id == serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: '服务器不存在' });
    }

    const sshConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 10000
    };

    if (server.authType === 'password' && server.password) {
      sshConfig.password = server.password;
    } else if (server.authType === 'key' && server.privateKey) {
      sshConfig.privateKey = server.privateKey;
    }

    const conn = new Client();
    
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, message: 'SFTP 错误: ' + err.message });
          conn.end();
          return;
        }

        // 先检查文件是否存在和是否为目录
        sftp.stat(filePath, (err, stats) => {
          if (err) {
            res.status(404).json({ success: false, message: '文件不存在: ' + err.message });
            conn.end();
            return;
          }

          if (stats.isDirectory()) {
            res.status(400).json({ success: false, message: '不能下载目录' });
            conn.end();
            return;
          }

          sftp.readFile(filePath, (err, data) => {
            if (err) {
              res.status(500).json({ success: false, message: '读取文件错误: ' + err.message });
            } else {
              // 获取文件名
              const filename = filePath.split('/').pop();
              
              res.setHeader('Content-Disposition', `attachment; filename=\"${encodeURIComponent(filename)}\"`);
              res.setHeader('Content-Type', 'application/octet-stream');
              res.send(data);
            }
            conn.end();
          });
        });
      });
    });

    conn.on('error', (err) => {
      res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message });
    });

    conn.connect(sshConfig);
    
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
  }
});

app.get('/api/sftp/list', async (req, res) => {
  const { serverId, path: remotePath = '/' } = req.query;
  
  try {
    const server = config.servers.find(s => s.id == serverId);
    if (!server) {
      return res.status(404).json({ success: false, message: '服务器不存在' });
    }

    const sshConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 10000
    };

    if (server.authType === 'password' && server.password) {
      sshConfig.password = server.password;
    } else if (server.authType === 'key' && server.privateKey) {
      sshConfig.privateKey = server.privateKey;
    }

    const conn = new Client();
    
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, message: 'SFTP 错误: ' + err.message });
          conn.end();
          return;
        }

        sftp.readdir(remotePath, (err, list) => {
          if (err) {
            res.status(500).json({ success: false, message: '读取目录错误: ' + err.message });
          } else {
            const files = list.map(item => {
              // 正确的文件类型检测
              let type = 'file';
              if (item.attrs.isDirectory) {
                type = 'directory';
              } else if (item.longname && item.longname.startsWith('l')) {
                type = 'link';
              }
              
              return {
                name: item.filename,
                longname: item.longname,
                type: type,
                size: item.attrs.size,
                mode: item.attrs.mode.toString(8),
                mtime: item.attrs.mtime,
                atime: item.attrs.atime
              };
            });
            res.json({ success: true, path: remotePath, files });
          }
          conn.end();
        });
      });
    });

    conn.on('error', (err) => {
      res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message });
    });

    conn.connect(sshConfig);
    
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
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
  console.log('');
  console.log('新功能:');
  console.log('  • xterm.js 终端: http://localhost:3000/xterm-terminal.html');
  console.log('  • SFTP 文件浏览器: http://localhost:3000/sftp-browser.html');
  console.log('');
  console.log('使用方法:');
  console.log('  1. 访问登录页面');
  console.log('  2. 登录后管理服务器');
  console.log('  3. 点击连接进入终端');
});