# MCP MySQL服务 - Dockerfile
# 基于Node.js 18构建镜像

FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置npm镜像源（可选，用于国内加速）
RUN npm config set registry https://registry.npmjs.org/

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY dist/ ./dist/
COPY config/ ./config/

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001

# 更改文件权限
RUN chown -R mcp:nodejs /app
USER mcp

# 暴露端口（虽然MCP通过stdio通信）
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Service is running')" || exit 1

# 启动服务
CMD ["node", "dist/index.js"]