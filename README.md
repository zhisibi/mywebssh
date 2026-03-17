# WebSSH Demo

基于 Node.js + Express + WebSocket + SSH2 的轻量级 Web SSH 管理工具。

## 当前入口

- 服务端主文件：`server-v3.js`
- 启动命令：`npm start`
- 默认地址：`http://localhost:3000`
- SFTP 浏览器：`http://localhost:3000/sftp-browser.html`
- xterm 终端：`http://localhost:3000/xterm-terminal.html`

## 已实现功能

### SSH / 终端
- WebSocket SSH 终端连接
- xterm.js 终端页面
- 基础输入/输出与连接状态提示

### 服务器管理
- 管理员登录
- 基于 token 的接口认证
- 服务器列表读取
- 新增 / 编辑 / 删除服务器配置

### SFTP 文件管理
- 目录浏览
- 文件/目录类型识别
- 面包屑导航
- 上传文件
- 新建文件夹
- 单文件下载
- 批量下载 ZIP
- 文件预览（文本）
- 重命名
- 删除文件
- 递归删除目录

## 启动

```bash
npm install
npm start
```

## 登录

默认管理员账号：

```txt
admin / admin123
```

登录后前端会自动保存 token 到浏览器本地存储。

## 主要 API

### 认证
- `POST /api/login`
- `POST /api/logout`

### 服务器
- `GET /api/servers`
- `POST /api/servers`
- `PUT /api/servers/:id`
- `DELETE /api/servers/:id`

### SFTP
- `GET /api/sftp/list`
- `POST /api/sftp/upload`
- `POST /api/sftp/mkdir`
- `GET /api/sftp/download`
- `POST /api/sftp/download-batch`
- `GET /api/sftp/read`
- `POST /api/sftp/rename`
- `POST /api/sftp/delete`

## 当前已知待优化项

- WebSocket SSH 连接尚未接入 token 鉴权
- 管理员密码仍是配置文件明文
- 暂无文件在线编辑保存
- 暂无复制/移动/权限修改
- 暂无拖拽上传与上传进度
- 暂无服务器管理前端页面

## 技术栈

- 后端：Node.js + Express + WebSocket + SSH2 + archiver
- 前端：原生 HTML / CSS / JavaScript
