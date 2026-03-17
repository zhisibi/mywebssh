# WebSSH Demo

基于 Node.js + WebSocket + SSH2 的轻量级 Web SSH 管理工具

## 功能特性

- Web 终端界面
- 实时 SSH 连接
- 基础键盘支持

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 修改服务器配置（server.js 中的 SSH_CONFIG）

3. 启动服务：
```bash
node server.js
```

4. 浏览器访问：http://localhost:3000

## 技术栈

- 后端：Node.js + Express + WebSocket + SSH2
- 前端：原生 HTML/CSS/JS

## 后续开发计划

- [ ] 服务器配置管理界面
- [ ] xterm.js 终端增强
- [ ] SFTP 文件浏览器
- [ ] 多会话支持
- [ ] 安全性增强