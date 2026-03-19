# WebSSH 后端调用说明书


---

## 目录

1. [认证接口](#1-认证接口)
2. [服务器管理](#2-服务器管理)
3. [SFTP 文件操作](#3-sftp-文件操作)
4. [WebSocket SSH](#4-websocket-ssh)
5. [错误码说明](#5-错误码说明)
6. [调用示例](#6-调用示例)

---

## 1. 认证接口

### 1.1 登录

```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "token": "924c8753da13e4af5deaa919d454bffd04c44b60516a9cbdc3d026bd91c47622"
}
```

**说明**: `token` 有效期 30 分钟，后续请求需要在 Header 中携带该 token。

---

### 1.2 登出

```http
POST /api/logout
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "message": "登出成功"
}
```

---

### 1.3 修改管理员密码

```http
POST /api/admin/password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "admin123",
  "newPassword": "newpassword"
}
```

**响应**:
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

---

## 2. 服务器管理

### 2.1 获取服务器列表

```http
GET /api/servers
Authorization: Bearer {token}
```

**响应**:
```json
[
  {
    "id": 1773839813662,
    "name": "在线测试",
    "host": "192.168.100.20",
    "port": 22,
    "username": "root",
    "authType": "password",
    "tags": [],
    "enabled": true
  }
]
```

**说明**: 返回的服务器信息不包含密码字段，需通过 `getServerConfig` 获取完整配置（仅内部使用）。

---

### 2.2 新增服务器

```http
POST /api/servers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "生产服务器",
  "host": "192.168.1.100",
  "port": 22,
  "username": "root",
  "authType": "password",
  "password": "yourpassword",
  "tags": ["生产", "重要"],
  "enabled": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "服务器添加成功",
  "id": 1773899999999
}
```

---

### 2.3 编辑服务器

```http
PUT /api/servers/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新名称",
  "host": "192.168.1.101",
  "port": 22,
  "username": "admin",
  "authType": "password",
  "password": "newpassword",
  "tags": [],
  "enabled": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "服务器更新成功"
}
```

---

### 2.4 删除服务器

```http
DELETE /api/servers/:id
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 3. SFTP 文件操作

> 所有 SFTP 接口都需要在 Header 中携带 `Authorization: Bearer {token}`

### 3.1 列出目录内容

```http
GET /api/sftp/list?serverId={serverId}&path={encodeURIComponent(path)}
```

**示例**:
```
GET /api/sftp/list?serverId=1773839813662&path=/
```

**响应**:
```json
{
  "success": true,
  "files": [
    {
      "name": "home",
      "type": "directory",
      "size": 4096,
      "mtime": 1773793243,
      "mode": "40755"
    },
    {
      "name": "test.txt",
      "type": "file",
      "size": 1024,
      "mtime": 1773793000,
      "mode": "100644"
    },
    {
      "name": "link",
      "type": "link",
      "size": 7,
      "mtime": 1773144445,
      "mode": "120777"
    }
  ]
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 文件/目录名称 |
| type | string | 类型：`directory` / `file` / `link` |
| size | number | 文件大小（字节），目录为 0 |
| mtime | number | 修改时间戳（秒） |
| mode | string | 权限八进制表示（如 `100644`） |

---

### 3.2 上传文件

```http
POST /api/sftp/upload
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverId": 1773839813662,
  "path": "/home/",
  "filename": "test.txt",
  "content": "文件内容的 Base64 编码"
}
```

**响应**:
```json
{
  "success": true,
  "message": "上传成功"
}
```

---

### 3.3 新建文件夹

```http
POST /api/sftp/mkdir
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverId": 1773839813662,
  "path": "/home/",
  "dirname": "newfolder"
}
```

**响应**:
```json
{
  "success": true,
  "message": "创建成功"
}
```

---

### 3.4 下载单个文件

```http
GET /api/sftp/download?serverId={serverId}&path={encodeURIComponent(filePath)}
```

**响应**: 返回文件二进制流，设置 `Content-Disposition` 头触发下载。

---

### 3.5 批量下载（ZIP）

```http
POST /api/sftp/download-batch
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverId": 1773839813662,
  "paths": ["/home/file1.txt", "/home/file2.txt"]
}
```

**响应**: 返回 ZIP 文件二进制流。

---

### 3.6 读取文件内容（预览）

```http
GET /api/sftp/read?serverId={serverId}&path={encodeURIComponent(filePath)}
```

**响应**:
```json
{
  "success": true,
  "content": "文件文本内容"
}
```

---

### 3.7 重命名

```http
POST /api/sftp/rename
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverId": 1773839813662,
  "oldPath": "/home/oldname.txt",
  "newPath": "/home/newname.txt"
}
```

**响应**:
```json
{
  "success": true,
  "message": "重命名成功"
}
```

---

### 3.8 删除文件/目录

```http
POST /api/sftp/delete
Authorization: Bearer {token}
Content-Type: application/json

{
  "serverId": 1773839813662,
  "targetPath": "/home/test.txt",
  "type": "file"
}
```

**参数说明**:
- `type`: `file` 或 `directory`

**响应**:
```json
{
  "success": true,
  "message": "删除成功"
}
```

---

## 4. WebSocket SSH

### 4.1 连接 WebSocket

```
ws://192.168.100.20:3000/ws/ssh?serverId={serverId}&token={token}
```

**参数**:
| 参数 | 说明 |
|------|------|
| serverId | 服务器 ID |
| token | 登录 token |

### 4.2 消息格式

**客户端 → 服务端**（发送命令）:
```json
{
  "type": "data",
  "data": "ls -la\n"
}
```

**服务端 → 客户端**（接收输出）:
```json
{
  "type": "data",
  "data": "root@server:~# ls -la\n..."
}
```

**连接状态**:
```json
{
  "type": "connected"
}
```

```json
{
  "type": "close",
  "data": "连接已关闭"
}
```

```json
{
  "type": "error",
  "data": "错误信息"
}
```

### 4.3 调整终端尺寸

```json
{
  "type": "resize",
  "cols": 80,
  "rows": 24
}
```

---

## 5. 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（token 无效或过期） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式**:
```json
{
  "success": false,
  "message": "错误描述信息"
}
```

---

## 6. 调用示例

### 6.1 cURL

```bash
# 1. 登录获取 token
TOKEN=$(curl -s -X POST http://192.168.100.20:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. 获取服务器列表
curl -s http://192.168.100.20:3000/api/servers \
  -H "Authorization: Bearer $TOKEN"

# 3. 列出 SFTP 目录
curl -s "http://192.168.100.20:3000/api/sftp/list?serverId=1773839813662&path=/" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.2 JavaScript

```javascript
class WebSSHClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async login(username, password) {
    const res = await fetch(`${this.baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    this.token = data.token;
    return data;
  }

  async getServers() {
    const res = await fetch(`${this.baseUrl}/api/servers`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  async listDirectory(serverId, path = '/') {
    const res = await fetch(
      `${this.baseUrl}/api/sftp/list?serverId=${serverId}&path=${encodeURIComponent(path)}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    return res.json();
  }

  async createFolder(serverId, path, dirname) {
    const res = await fetch(`${this.baseUrl}/api/sftp/mkdir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify({ serverId, path, dirname })
    });
    return res.json();
  }

  connectWS(serverId) {
    const ws = new WebSocket(
      `ws://${this.baseUrl.replace('http://', '')}/ws/ssh?serverId=${serverId}&token=${this.token}`
    );
    return ws;
  }
}

// 使用示例
const client = new WebSSHClient('http://192.168.100.20:3000');
await client.login('admin', 'admin123');
const servers = await client.getServers();
const files = await client.listDirectory(servers[0].id, '/home');
```

### 6.3 Python

```python
import requests
import base64

class WebSSHClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
    
    def login(self, username, password):
        resp = requests.post(
            f"{self.base_url}/api/login",
            json={"username": username, "password": password}
        )
        data = resp.json()
        self.token = data.get("token")
        return data
    
    def get_servers(self):
        resp = requests.get(
            f"{self.base_url}/api/servers",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return resp.json()
    
    def list_dir(self, server_id, path="/"):
        resp = requests.get(
            f"{self.base_url}/api/sftp/list",
            params={"serverId": server_id, "path": path},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return resp.json()
    
    def create_folder(self, server_id, path, dirname):
        resp = requests.post(
            f"{self.base_url}/api/sftp/mkdir",
            json={"serverId": server_id, "path": path, "dirname": dirname},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return resp.json()

# 使用示例
client = WebSSHClient("http://192.168.100.20:3000")
client.login("admin", "admin123")
servers = client.get_servers()
files = client.list_dir(servers[0]["id"], "/home")
```

---

## 附录

### 公共页面入口

| 页面 | URL |
|------|-----|
| 登录页 | http://192.168.100.20:3000 |
| 控制面板 | http://192.168.100.20:3000/dashboard.html |
| SSH 终端 | http://192.168.100.20:3000/xterm-terminal.html?server={serverId} |
| SFTP 文件管理 | http://192.168.100.20:3000/sftp-browser.html?server={serverId} |

---

*文档更新时间: 2026-03-19*
