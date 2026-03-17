const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静态文件，前端页面
app.use(express.static(path.join(__dirname, 'public')));

// 这里为了简单，先写死一个服务器配置（后面再做"服务器配置管理"模块）
const SSH_CONFIG = {
  host: '192.168.100.20',   // 目标服务器 IP/域名
  port: 22,
  username: 'root',
  password: '1234', // 或者用 privateKey
  // privateKey: require('fs').readFileSync('/path/to/id_rsa')
};

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH connection ready');

    conn.shell((err, stream) => {
      if (err) {
        ws.send('\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
        ws.close();
        conn.end();
        return;
      }

      // SSH → 浏览器
      stream.on('data', (data) => {
        ws.send(data.toString('utf-8'));
      });

      stream.on('close', () => {
        console.log('SSH stream closed');
        ws.close();
        conn.end();
      });

      // 浏览器 → SSH
      ws.on('message', (msg) => {
        stream.write(msg);
      });

      ws.on('close', () => {
        console.log('WebSocket closed by client');
        conn.end();
      });

      ws.on('error', (err) => {
        console.log('WebSocket error:', err.message);
        conn.end();
      });
    });
  });

  conn.on('error', (err) => {
    console.log('SSH connection error:', err.message);
    try {
      ws.send('\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
    } catch (e) {}
    ws.close();
  });

  conn.on('end', () => {
    console.log('SSH connection ended');
    ws.close();
  });

  conn.on('close', () => {
    console.log('SSH connection closed');
    ws.close();
  });

  conn.connect(SSH_CONFIG);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`WebSSH server running at http://localhost:${PORT}`);
});