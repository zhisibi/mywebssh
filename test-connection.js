const { Client } = require('ssh2');

console.log('测试 SSH 连接到 127.0.0.1:22...');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH 连接成功!');
  conn.end();
});

conn.on('error', (err) => {
  console.log('SSH 连接错误:', err.message);
});

conn.on('close', () => {
  console.log('SSH 连接已关闭');
});

// 尝试连接
conn.connect({
  host: '127.0.0.1',
  port: 22,
  username: 'root',
  password: 'yourpassword',
  readyTimeout: 5000
});