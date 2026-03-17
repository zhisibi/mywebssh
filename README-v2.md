# WebSSH 增强版

基于 Node.js + WebSocket + SSH2 的完整 Web SSH 管理工具

## 新增功能

### Milestone 1 完成功能
- ✅ 管理员登录认证系统
- ✅ 服务器配置管理（增删改查）
- ✅ 多服务器支持
- ✅ 配置文件持久化
- ✅ 完整的 Web 管理界面

### 技术特性
- RESTful API 设计
- WebSocket 实时通信
- JSON 配置文件管理
- 响应式前端界面

## 快速开始

1. 安装依赖（已完成）
```bash
npm install
```

2. 启动服务器
```bash
npm start
# 或
node server-v2.js
```

3. 访问管理界面
```
http://localhost:3000/login.html
```

4. 使用默认账号登录
```
用户名: admin
密码: admin123
```

## 配置文件说明

`config.json` 包含：
- 管理员账号信息
- 服务器列表配置
- 服务端口设置

## API 接口

- `POST /api/login` - 用户登录
- `GET /api/servers` - 获取服务器列表
- `POST /api/servers` - 添加服务器
- `PUT /api/servers/:id` - 修改服务器
- `DELETE /api/servers/:id` - 删除服务器

## 后续开发计划

### Milestone 2（体验增强）
- [ ] xterm.js 集成
- [ ] SFTP 文件浏览器
- [ ] 多标签页支持
- [ ] 主题切换功能

### Milestone 3（安全增强）
- [ ] HTTPS 支持
- [ ] 访问日志记录
- [ ] 多用户权限系统
- [ ] 连接审计功能

## 文件结构

```
webssh/
├── server-v2.js          # 主服务器文件（增强版）
├── config.json           # 配置文件
├── package.json          # 项目配置
├── public/               # 前端文件
│   ├── index.html       # 旧版终端页面
│   ├── login.html       # 登录页面
│   ├── dashboard.html    # 管理面板
│   └── terminal.html    # 新版终端页面
├── start.sh             # 启动脚本
└── README-v2.md         # 增强版说明
```