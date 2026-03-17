# WebSSH Demo

基于 Node.js + Express + WebSocket + SSH2 的轻量级 Web SSH 管理工具。

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务将运行在：`http://localhost:3000`

首次打开会自动跳转到登录页，使用默认账号登录即可：
- 用户名：`admin`
- 密码：`admin123`

## 核心功能

### 服务器管理（控制面板）

- **入口**：登录后自动进入控制面板 `/dashboard.html`
- **功能**：
  - 查看所有服务器
  - 新增服务器
  - 编辑服务器配置
  - 删除服务器
- **操作**：
  - 点“SSH” → 进入终端会话
  - 点“SFTP” → 进入该服务器的文件管理（单服务器直达视图）

### SSH 终端

- **入口**：从控制面板点某个服务器的“SSH”按钮
- **技术栈**：xterm.js + WebSocket + SSH2
- **特点**：
  - 自动根据服务器配置建立 SSH 连接
  - 基础输入/输出
  - 连接状态显示（连接中 / 已连接 / 已断开）
- **注意**：首次使用时请确保服务器网络可达

### SFTP 文件浏览器

- **入口**：从控制面板点某个服务器的“SFTP”按钮
- **特点**：
  - **单服务器直达视图**：从控制面板选好服务器，直接进入该服务器的文件列表，无需二次选择
  - 目录浏览与面包屑导航
  - 文件类型识别（目录 / 文件 / 符号链接）
  - 上传文件
  - 新建文件夹
  - 单文件下载
  - 批量下载 ZIP
  - 文件预览（文本文件）
  - 重命名
  - 删除文件
  - 递归删除目录
- **移动端适配**：
  - 顶部工具栏在小屏幕下自动折行
  - 表格可横向滚动
  - 左侧服务器列表默认隐藏（可按需展开）

## 主要 API

### 认证
- `POST /api/login` - 登录，返回 token
- `POST /api/logout` - 登出

### 服务器管理
- `GET /api/servers` - 获取服务器列表（需要 token）
- `POST /api/servers` - 新增服务器（需要 token）
- `PUT /api/servers/:id` - 编辑服务器（需要 token）
- `DELETE /api/servers/:id` - 删除服务器（需要 token）

### SFTP 文件操作（均需要 token）
- `GET /api/sftp/list` - 列出目录内容
- `POST /api/sftp/upload` - 上传文件
- `POST /api/sftp/mkdir` - 新建文件夹
- `GET /api/sftp/download` - 下载单个文件
- `POST /api/sftp/download-batch` - 批量下载 ZIP
- `GET /api/sftp/read` - 读取文本文件内容
- `POST /api/sftp/rename` - 重命名
- `POST /api/sftp/delete` - 删除文件或目录

## 典型使用流程

### 1. 登录
访问 `http://localhost:3000`，使用 `admin / admin123` 登录

### 2. 添加服务器
在控制面板点击“添加服务器”，填写服务器信息（主机、端口、用户名、认证方式等）

### 3. 使用 SFTP 文件管理
- 在控制面板点击某个服务器的“SFTP”按钮
- 自动进入该服务器的文件列表
- 支持浏览目录、上传/下载、重命名、删除等操作

### 4. 使用 SSH 终端
- 在控制面板点击某个服务器的“SSH”按钮
- 进入终端会话
- 可正常执行命令

## 配置说明

项目使用 `config.json` 存储配置：
- `admin`: 管理员账号信息
- `servers`: 服务器配置列表
- `port`: 服务运行端口（默认 3000）

注意：当前配置文件中的密码为明文存储，建议在生产环境中自行实现加密机制。

## 待优化项

- WebSocket SSH 连接的详细状态提示和错误处理（当前已加入日志，便于调试）
- 管理员密码的安全存储机制
- 文件在线编辑并保存
- 复制/移动文件和目录
- 文件/目录权限修改
- 拖拽上传和上传进度显示
- 更完善的移动端适配
- 多会话支持

## 技术栈

- **后端**：Node.js + Express + WebSocket + SSH2 + archiver
- **前端**：原生 HTML / CSS / JavaScript（无框架依赖）
- **终端**：xterm.js
