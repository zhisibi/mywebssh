FROM node:18-alpine

WORKDIR /app

# 先复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码（排除 node_modules）
COPY . .

# 确保配置文件存在（使用默认值）
RUN if [ ! -f config.json ]; then \
    echo '{"admin":{"username":"admin","password":"admin123"},"servers":[],"port":3000}' > config.json; \
    fi

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"]
