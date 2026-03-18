const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 配置文件
const configPath = path.join(__dirname, 'config.json');
let config = loadConfig();

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
  session.lastActive = Date.now();
  sessions.set(token, session);
  req.session = session;
  req.token = token;
  next();
}

// API 路由
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.admin.username && password === config.admin.password) {
    const token = crypto.randomBytes(16).toString('hex');
    sessions.set(token, {
      username,
      createdAt: Date.now(),
      lastActive: Date.now()
    });

    res.json({ success: true, message: '登录成功', token });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true, message: '已退出登录' });
});

// 修改管理员密码
app.post('/api/admin/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '请提供旧密码和新密码' });
  }
  
  if (oldPassword !== config.admin.password) {
    return res.status(400).json({ success: false, message: '旧密码错误' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '新密码至少需要6个字符' });
  }
  
  config.admin.password = newPassword;
  saveConfig();
  
  // 清除所有会话，强制重新登录
  sessions.clear();
  
  res.json({ success: true, message: '密码修改成功，请重新登录' });
});

app.get('/api/servers', requireAuth, (req, res) => {
  res.json(config.servers.filter(server => server.enabled));
});

app.post('/api/servers', requireAuth, (req, res) => {
  const newServer = {
    id: Date.now(),
    ...req.body,
    enabled: true
  };
  config.servers.push(newServer);
  saveConfig();
  res.json({ success: true, server: newServer });
});

app.put('/api/servers/:id', requireAuth, (req, res) => {
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

app.delete('/api/servers/:id', requireAuth, (req, res) => {
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
// SFTP 创建文件夹
app.post('/api/sftp/mkdir', requireAuth, async (req, res) => {
  const { serverId, path: remotePath, dirname } = req.body;
  
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

        const remoteDirPath = remotePath === '/' 
          ? `/${dirname}` 
          : `${remotePath}/${dirname}`;

        sftp.mkdir(remoteDirPath, (err) => {
          if (err) {
            res.status(500).json({ success: false, message: '创建文件夹错误: ' + err.message });
          } else {
            res.json({ success: true, message: '文件夹创建成功', path: remoteDirPath });
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

// SFTP 文件上传
app.post('/api/sftp/upload', requireAuth, express.json({ limit: '50mb' }), async (req, res) => {
  const { serverId, path: remotePath, filename, content } = req.body;
  
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

        const remoteFilePath = remotePath === '/' ? 
          `/${filename}` : 
          `${remotePath}/${filename}`;

        // 将 Base64 内容转换为 Buffer
        const fileBuffer = Buffer.from(content, 'base64');
        
        sftp.writeFile(remoteFilePath, fileBuffer, (err) => {
          if (err) {
            res.status(500).json({ success: false, message: '上传文件错误: ' + err.message });
          } else {
            res.json({ success: true, message: '文件上传成功', path: remoteFilePath });
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

// SFTP 文件下载
// SFTP 文件夹下载
app.post('/api/sftp/download-batch', requireAuth, async (req, res) => {
  const { serverId, paths } = req.body;

  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ success: false, message: '缺少要下载的文件/目录列表' });
  }

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

        // 设置响应为 zip
        res.setHeader('Content-Disposition', 'attachment; filename="download.zip"');
        res.setHeader('Content-Type', 'application/zip');

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', err => {
          console.error('压缩错误:', err);
          try { res.end(); } catch (e) {}
        });

        archive.pipe(res);

        let pending = 0;
        let finished = false;

        function doneOne() {
          if (finished) return;
          pending--;
          if (pending === 0) {
            finished = true;
            archive.finalize();
            conn.end();
          }
        }

        function addFileOrDir(remotePath, zipPath) {
          pending++;

          sftp.stat(remotePath, (err, stats) => {
            if (err) {
              console.error('stat 失败:', remotePath, err.message);
              return doneOne();
            }

            if (stats.isDirectory()) {
              const dirName = zipPath || remotePath.split('/').filter(Boolean).pop();
              // 目录本身
              if (dirName) {
                archive.append(null, { name: dirName + '/', type: 'directory' });
              }

              sftp.readdir(remotePath, (err, list) => {
                if (err) {
                  console.error('读取目录失败:', remotePath, err.message);
                  return doneOne();
                }

                if (!list || list.length === 0) {
                  // 空目录
                  return doneOne();
                }

                list.forEach(item => {
                  const childRemote = remotePath === '/'
                    ? '/' + item.filename
                    : remotePath + '/' + item.filename;
                  const childZipPath = (dirName ? dirName + '/' : '') + item.filename;
                  addFileOrDir(childRemote, childZipPath);
                });

                doneOne();
              });
            } else {
              // 普通文件
              const fileName = zipPath || remotePath.split('/').pop();
              const readStream = sftp.createReadStream(remotePath);
              archive.append(readStream, { name: fileName });
              readStream.on('end', () => {
                doneOne();
              });
              readStream.on('error', (err) => {
                console.error('读取文件失败:', remotePath, err.message);
                doneOne();
              });
            }
          });
        }

        // 启动所有路径的处理
        paths.forEach(p => addFileOrDir(p, null));
      });
    });

    conn.on('error', (err) => {
      console.error('SSH 连接错误:', err.message);
      try {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message });
        }
      } catch (e) {}
    });

    conn.connect(sshConfig);
  } catch (error) {
    console.error('服务器错误:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
    }
  }
});



// SFTP 文件下载
app.get('/api/sftp/download', requireAuth, async (req, res) => {
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
              
              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
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
//文件显示
app.get('/api/sftp/list', requireAuth, async (req, res) => {
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
              let type = 'file';
              const longname = item.longname || '';
              if (longname.startsWith('l')) {
                type = 'link';
              } else if (typeof item.attrs.isDirectory === 'function' ? item.attrs.isDirectory() : longname.startsWith('d')) {
                type = 'directory';
              }

              return {
                name: item.filename,
                longname,
                type,
                size: item.attrs.size,
                mode: item.attrs.mode ? item.attrs.mode.toString(8) : '',
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

app.post('/api/sftp/rename', requireAuth, async (req, res) => {
  const { serverId, oldPath, newPath } = req.body;

  try {
    const server = config.servers.find(s => s.id == serverId);
    if (!server) return res.status(404).json({ success: false, message: '服务器不存在' });

    const sshConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 10000
    };
    if (server.authType === 'password' && server.password) sshConfig.password = server.password;
    else if (server.authType === 'key' && server.privateKey) sshConfig.privateKey = server.privateKey;

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, message: 'SFTP 错误: ' + err.message });
          conn.end();
          return;
        }
        sftp.rename(oldPath, newPath, (err) => {
          if (err) res.status(500).json({ success: false, message: '重命名失败: ' + err.message });
          else res.json({ success: true, message: '重命名成功' });
          conn.end();
        });
      });
    });
    conn.on('error', (err) => res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message }));
    conn.connect(sshConfig);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
  }
});

app.post('/api/sftp/delete', requireAuth, async (req, res) => {
  const { serverId, targetPath, type } = req.body;

  try {
    const server = config.servers.find(s => s.id == serverId);
    if (!server) return res.status(404).json({ success: false, message: '服务器不存在' });

    const sshConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 10000
    };
    if (server.authType === 'password' && server.password) sshConfig.password = server.password;
    else if (server.authType === 'key' && server.privateKey) sshConfig.privateKey = server.privateKey;

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, message: 'SFTP 错误: ' + err.message });
          conn.end();
          return;
        }

        const removeRecursively = (remotePath, done) => {
          sftp.readdir(remotePath, (err, list) => {
            if (err) return sftp.rmdir(remotePath, done);
            let pending = list.length;
            if (!pending) return sftp.rmdir(remotePath, done);

            list.forEach(item => {
              const child = remotePath.endsWith('/') ? remotePath + item.filename : remotePath + '/' + item.filename;
              const longname = item.longname || '';
              const isDir = typeof item.attrs.isDirectory === 'function' ? item.attrs.isDirectory() : longname.startsWith('d');
              if (isDir && !longname.startsWith('l')) {
                removeRecursively(child, after);
              } else {
                sftp.unlink(child, after);
              }
            });

            function after(err) {
              if (after.done) return;
              if (err) {
                after.done = true;
                return done(err);
              }
              pending -= 1;
              if (pending === 0) sftp.rmdir(remotePath, done);
            }
          });
        };

        const finish = (err) => {
          if (err) res.status(500).json({ success: false, message: '删除失败: ' + err.message });
          else res.json({ success: true, message: '删除成功' });
          conn.end();
        };

        if (type === 'directory') removeRecursively(targetPath, finish);
        else sftp.unlink(targetPath, finish);
      });
    });
    conn.on('error', (err) => res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message }));
    conn.connect(sshConfig);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
  }
});

app.get('/api/sftp/read', requireAuth, async (req, res) => {
  const { serverId, path: filePath } = req.query;
  try {
    const server = config.servers.find(s => s.id == serverId);
    if (!server) return res.status(404).json({ success: false, message: '服务器不存在' });

    const sshConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 10000
    };
    if (server.authType === 'password' && server.password) sshConfig.password = server.password;
    else if (server.authType === 'key' && server.privateKey) sshConfig.privateKey = server.privateKey;

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, message: 'SFTP 错误: ' + err.message });
          conn.end();
          return;
        }
        sftp.readFile(filePath, (err, data) => {
          if (err) {
            res.status(500).json({ success: false, message: '读取文件失败: ' + err.message });
          } else {
            res.json({ success: true, content: data.toString('utf8') });
          }
          conn.end();
        });
      });
    });
    conn.on('error', (err) => res.status(500).json({ success: false, message: 'SSH 连接错误: ' + err.message }));
    conn.connect(sshConfig);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误: ' + error.message });
  }
});

// WebSocket SSH 连接
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    try {
      console.log('Received message:', data);
      const message = JSON.parse(data);
      console.log('Parsed message:', message);

      if (message.type === 'connect') {
        const token = message.token;
        console.log('Token:', token);

        if (!token || !sessions.has(token)) {
          console.log('Unauthorized access attempt');
          ws.send(JSON.stringify({ type: 'error', message: '未授权访问' }));
          ws.close();
          return;
        }

        const session = sessions.get(token);
        session.lastActive = Date.now();
        sessions.set(token, session);

        const server = config.servers.find(s => s.id === message.serverId);
        console.log('Server:', server);

        if (!server) {
          console.log('Server not found:', message.serverId);
          ws.send(JSON.stringify({ type: 'error', message: '服务器不存在' }));
          ws.close();
          return;
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

        console.log('Connecting to SSH:', sshConfig);
        connectSSH(ws, sshConfig);
      }
    } catch (error) {
      console.log('WebSocket message error:', error.message, error.stack);
      try { ws.send(JSON.stringify({ type: 'error', message: '消息处理失败: ' + error.message })); } catch (_) {}
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.log('WebSocket error:', error);
  });
});

function connectSSH(ws, sshConfig) {
  const conn = new Client();

  console.log('SSH connecting to:', sshConfig.host, sshConfig.port);

  conn.on('ready', () => {
    console.log('SSH connection ready');
    try {
      ws.send(JSON.stringify({ type: 'connected', message: 'SSH连接成功' }));
    } catch (e) {
      console.log('Error sending connected message:', e.message);
    }

    conn.shell((err, stream) => {
      if (err) {
        console.log('SSH shell error:', err.message);
        try {
          ws.send(JSON.stringify({ type: 'error', message: 'SSH SHELL ERROR: ' + err.message }));
        } catch (e) {
          console.log('Error sending shell error message:', e.message);
        }
        ws.close();
        conn.end();
        return;
      }

      console.log('SSH shell created');

      // SSH → 浏览器
      stream.on('data', (data) => {
        try {
          ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
        } catch (e) {
          // WebSocket may be closed
        }
      });

      stream.on('close', () => {
        console.log('SSH stream closed');
        try {
          ws.send(JSON.stringify({ type: 'close', message: 'SSH连接已关闭' }));
        } catch (e) {
          console.log('Error sending close message:', e.message);
        }
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
          console.log('Error handling message:', e.message);
        }
      });
    });
  });

  conn.on('error', (err) => {
    console.log('SSH connection error:', err.message);
    try {
      ws.send(JSON.stringify({ type: 'error', message: 'SSH连接错误: ' + err.message }));
    } catch (e) {
      console.log('Error sending error message:', e.message);
    }
    ws.close();
  });

  conn.on('close', () => {
    console.log('SSH connection closed');
    try {
      ws.close();
    } catch (e) {
      console.log('Error closing WebSocket:', e.message);
    }
  });

  conn.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
    console.log('SSH keyboard-interactive');
    finish([sshConfig.password || '']);
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

// 会话清理（每小时清理一次过期会话）
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.lastActive > 3600000) { // 1小时
      sessions.delete(token);
      console.log('清理过期会话:', token);
    }
  }
}, 3600000); // 每小时清理一次

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