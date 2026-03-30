# WebSSH 后端 API 文档

## 概述

基于 Node.js + Express + ssh2 + WebSocket 的 WebSSH 后端服务。提供 SSH 终端代理和 SFTP 文件操作 API。

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js |
| HTTP 框架 | Express |
| WebSocket | ws |
| SSH 客户端 | ssh2 |
| 加密 | AES-256-GCM |
| 打包 | archiver (ZIP) |

## 安全机制

- **配置加密**：服务器密码/密钥等敏感字段使用 AES-256-GCM 加密存储
- **会话管理**：Token 有效期 30 分钟，自动清理过期会话
- **密码哈希**：管理员密码加密存储

## API 接口

### 1. 认证

#### 登录
```
POST /api/login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```
响应: `{ "success": true, "message": "登录成功", "token": "xxx" }`

#### 登出
```
POST /api/logout
Authorization: Bearer {token}
```

#### 修改密码
```
POST /api/admin/password
Authorization: Bearer {token}
Content-Type: application/json

{ "oldPassword": "admin123", "newPassword": "newpass" }
```

### 2. 服务器管理

#### 获取列表
```
GET /api/servers
Authorization: Bearer {token}
```
响应: `[{ "id", "name", "host", "port", "username", "authType", "tags", "enabled" }]`

#### 添加
```
POST /api/servers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "生产服务器",
  "host": "192.168.1.100",
  "port": 22,
  "username": "root",
  "authType": "password",  // 或 "key"
  "password": "xxx",       // 密码认证时
  "privateKey": "xxx",     // 密钥认证时
  "passphrase": "xxx",     // 密钥密码（可选）
  "tags": ["生产"],
  "enabled": true
}
```

#### 更新
```
PUT /api/servers/:id
Authorization: Bearer {token}
Content-Type: application/json

{ 同添加，所有字段可选 }
```

#### 删除
```
DELETE /api/servers/:id
Authorization: Bearer {token}
```

### 3. SFTP 文件操作

所有请求需要 `Authorization: Bearer {token}`。

#### 列出目录
```
GET /api/sftp/list?serverId={id}&path={encoded_path}
```
响应: `{ "success": true, "files": [{ "name", "type", "size", "mtime", "mode" }] }`

#### 上传文件
```
POST /api/sftp/upload
Content-Type: application/json

{
  "serverId": 123,
  "path": "/home/",
  "filename": "test.txt",
  "content": "base64编码的文件内容"
}
```

#### 下载单文件
```
GET /api/sftp/download?serverId={id}&path={encoded_path}
```
返回二进制流。

#### 批量下载 ZIP
```
POST /api/sftp/download-batch
Content-Type: application/json

{ "serverId": 123, "paths": ["/home/file1.txt", "/home/file2.txt"] }
```
返回 ZIP 二进制流。

#### 读取文件内容
```
GET /api/sftp/read?serverId={id}&path={encoded_path}
```
响应: `{ "success": true, "content": "文件文本内容" }`

#### 新建文件夹
```
POST /api/sftp/mkdir
{ "serverId": 123, "path": "/home/", "dirname": "newfolder" }
```

#### 重命名
```
POST /api/sftp/rename
{ "serverId": 123, "oldPath": "/home/old", "newPath": "/home/new" }
```

#### 删除
```
POST /api/sftp/delete
{ "serverId": 123, "targetPath": "/home/file.txt", "type": "file" }
```
type: `"file"` 或 `"directory"`

### 4. 数据备份/恢复

#### 备份
```
GET /api/admin/backup
Authorization: Bearer {token}
```
响应: `{ "success": true, "servers": [...] }`

#### 恢复
```
POST /api/admin/restore
Authorization: Bearer {token}
Content-Type: application/json

{ "content": "{\"servers\":[...]}" }
```

### 5. WebSocket SSH 终端

```
ws://host:3000/ws/ssh?server={serverId}&token={token}
```

#### 连接后发送命令
```json
{ "type": "data", "data": "ls -la\n" }
```

#### 调整终端尺寸
```json
{ "type": "resize", "cols": 80, "rows": 24 }
```

#### 服务端消息类型
| type | 说明 |
|------|------|
| `connected` | SSH 连接建立 |
| `data` | 终端输出数据 |
| `error` | 错误信息 |
| `close` | 连接关闭 |

## 配置文件

`config.json` 自动管理，结构：
```json
{
  "admin": { "username": "admin", "password": "加密后的密码" },
  "servers": [
    {
      "id": 1773839813662,
      "name": "服务器名称",
      "host": "加密后的host",
      "_host": "明文host（内部使用）",
      "port": "加密后的port",
      "_port": 22,
      "username": "加密后的用户名",
      "_username": "root",
      "authType": "password",
      "password": "加密后的密码",
      "privateKey": "加密后的私钥",
      "tags": [],
      "enabled": true
    }
  ],
  "port": 3000
}
```

## 启动

```bash
cd webssh
npm install
node server.js
# 默认监听 http://localhost:3000
```

---
*文档更新: 2026-03-30*
