# MCP MySQL服务 - 最小可用版本

这是一个基于MCP（Model Context Protocol）协议的MySQL数据库查询服务的最小可用版本。

## ✅ 实现状态

### 核心功能已实现
- ✅ **编译通过** - TypeScript代码成功编译
- ✅ **服务启动** - 基础服务框架可以正常启动
- ✅ **测试通过** - 基础功能测试用例全部通过
- ✅ **Docker支持** - 提供完整的容器化部署配置

### 核心MCP工具
- ✅ `mysql_connect` - 测试数据库连接状态
- ✅ `mysql_list_tables` - 获取数据库表列表
- ✅ `mysql_describe_table` - 查询表结构详情
- ✅ `mysql_table_stats` - 获取表统计信息
- ✅ `mysql_analyze_column` - 分析列数据分布
- ✅ `mysql_execute_safe_query` - 执行安全的SELECT查询

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- MySQL 8.0+
- npm >= 8.0.0
- ClaudeCode CLI (用于MCP集成)

### 安装方式

#### 通过npm安装
```bash
npm install -g mcp-mysql-service
```

#### 通过源码安装
```bash
# 克隆仓库
git clone https://github.com/wms-cloud/mcp-mysql-service.git
cd mcp-mysql-service

# 安装依赖
npm install
```

### 配置环境
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑配置文件
# 设置数据库连接信息
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### 构建项目
```bash
npm run build
```

### 运行测试
```bash
npm test
```

### 启动服务
```bash
npm start
```

## 🔗 ClaudeCode MCP集成

### 1. 配置ClaudeCode MCP服务

在ClaudeCode环境中配置MCP服务，有两种方式：

#### 方式一：编辑ClaudeCode配置文件
在ClaudeCode配置目录中，编辑或创建MCP配置文件：

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mysql-query": {
      "command": "node",
      "args": ["path/to/mcp-mysql-service/dist/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "3306",
        "DB_NAME": "your_database",
        "DB_USER": "your_username",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

#### 方式二：使用全局安装（推荐）
如果通过npm全局安装了服务，配置更简单：

```json
{
  "mcpServers": {
    "mysql-query": {
      "command": "mcp-mysql-service",
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "3306", 
        "DB_NAME": "your_database",
        "DB_USER": "your_username",
        "DB_PASSWORD": "your_password"
      }
    }
  }
}
```

### 2. 重启ClaudeCode
配置完成后，重启ClaudeCode客户端以加载MCP服务。

### 3. 验证MCP服务
在ClaudeCode中可以看到以下可用工具：
- `mysql_connect` - 测试数据库连接
- `mysql_list_tables` - 获取表列表
- `mysql_describe_table` - 查询表结构
- `mysql_table_stats` - 获取表统计信息
- `mysql_analyze_column` - 分析列数据
- `mysql_execute_safe_query` - 执行安全查询

## 💡 ClaudeCode使用示例

### 基础数据库探索
```
用户: 帮我查看当前数据库有哪些表？

ClaudeCode: 我来帮您查看数据库中的表列表。
[使用 mysql_list_tables 工具]

结果: 
- users (用户表)
- orders (订单表) 
- products (商品表)
- categories (分类表)
```

### 表结构分析
```
用户: 请分析users表的结构

ClaudeCode: 我来查看users表的详细结构。
[使用 mysql_describe_table 工具]

结果:
表: users
列信息:
- id: INT(11) AUTO_INCREMENT PRIMARY KEY
- username: VARCHAR(50) NOT NULL
- email: VARCHAR(100) UNIQUE
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- status: ENUM('active','inactive','pending')
```

### 数据统计分析
```
用户: 分析一下orders表的数据情况

ClaudeCode: 我来分析orders表的统计信息。
[使用 mysql_table_stats 工具]

结果:
- 总行数: 15,847
- 表大小: 2.3 MB
- 平均行长度: 152 bytes
- 最后更新: 2025-01-19 10:30:00
```

### 数据分布分析
```
用户: 看看用户状态的分布情况

ClaudeCode: 我来分析users表中status字段的数据分布。
[使用 mysql_analyze_column 工具]

结果:
status字段分布:
- active: 8,234 (68.5%)
- inactive: 2,156 (17.9%) 
- pending: 1,632 (13.6%)
```

### 自定义查询
```
用户: 查询最近7天注册的活跃用户数量

ClaudeCode: 我来执行这个查询。
[使用 mysql_execute_safe_query 工具]

查询: SELECT COUNT(*) as count FROM users 
       WHERE status = 'active' 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)

结果: 最近7天新注册的活跃用户: 142人
```

## 🎯 典型使用场景

### 1. 开发阶段数据验证
```
- 验证数据库表结构是否正确
- 检查数据插入后的状态
- 快速统计测试数据量
- 验证索引和约束配置
```

### 2. 数据分析和报告
```
- 生成数据统计报告
- 分析用户行为模式
- 监控业务关键指标
- 数据质量检查
```

### 3. 故障诊断和调试
```
- 快速定位数据异常
- 检查数据一致性
- 验证SQL执行结果
- 性能问题初步分析
```

### 4. 业务数据探索
```
- 探索新数据源结构
- 了解数据分布特征
- 发现数据关联关系
- 制定数据处理策略
```

## 🔧 开发指南

### 项目结构
```
mcp-mysql-service/
├── src/                    # 源代码
│   ├── index.ts           # 主入口文件
│   ├── mysql-client.ts    # MySQL客户端
│   ├── mcp-server.ts      # MCP服务器实现
│   ├── query-handlers.ts  # 查询处理器
│   ├── types/             # 类型定义
│   │   └── mcp.ts         # MCP类型定义
│   └── utils/             # 工具类
│       ├── config.ts      # 配置管理
│       ├── error-handler.ts # 错误处理
│       └── logger.ts      # 日志记录
├── tests/                 # 测试文件
│   └── basic.test.ts      # 基础功能测试
├── dist/                  # 编译输出
├── config/                # 配置文件
├── Dockerfile            # Docker配置
└── package.json          # 项目配置
```

### 开发命令
```bash
# 开发模式运行
npm run dev

# 构建项目
npm run build

# 运行测试
npm test

# 代码检查
npm run lint

# 清理构建文件
npm run clean
```

## 🐳 Docker部署

### 构建镜像
```bash
docker build -t mcp-mysql-service .
```

### 运行容器
```bash
docker run -d \
  --name mcp-mysql \
  -e DB_HOST=your_db_host \
  -e DB_USER=your_db_user \
  -e DB_PASSWORD=your_db_password \
  -e DB_NAME=your_database \
  mcp-mysql-service
```

## 🔒 安全特性

- **只读权限** - 仅支持SELECT查询操作
- **SQL注入防护** - 自动检测和阻止危险SQL语句
- **结果限制** - 自动限制查询结果行数（默认1000行）
- **查询超时** - 设置查询执行超时时间
- **参数化查询** - 支持安全的参数化查询

## 📊 MCP工具说明

### mysql_connect
测试MySQL数据库连接状态
```json
{
  "name": "mysql_connect",
  "arguments": {}
}
```

### mysql_list_tables
获取数据库中所有表的列表
```json
{
  "name": "mysql_list_tables",
  "arguments": {}
}
```

### mysql_describe_table
获取指定表的详细结构信息
```json
{
  "name": "mysql_describe_table",
  "arguments": {
    "tableName": "users"
  }
}
```

### mysql_table_stats
获取表的统计信息
```json
{
  "name": "mysql_table_stats",
  "arguments": {
    "tableName": "users"
  }
}
```

### mysql_analyze_column
分析指定列的数据分布
```json
{
  "name": "mysql_analyze_column",
  "arguments": {
    "tableName": "users",
    "columnName": "status",
    "analysisType": "distribution"
  }
}
```

### mysql_execute_safe_query
执行安全的SELECT查询
```json
{
  "name": "mysql_execute_safe_query",
  "arguments": {
    "query": "SELECT id, name FROM users WHERE status = ?",
    "params": ["active"]
  }
}
```

## 🐛 故障排除

### 常见问题

#### 1. MCP服务无法在ClaudeCode中加载
**症状**: ClaudeCode启动后看不到mysql工具

**可能原因及解决方案**:
```bash
# 检查配置文件路径是否正确
# Windows: %APPDATA%\Claude\claude_desktop_config.json
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json  
# Linux: ~/.config/claude/claude_desktop_config.json

# 检查JSON格式是否正确
# 使用JSON验证器检查配置文件

# 检查服务是否可以独立启动
cd path/to/mcp-mysql-service
npm start

# 检查日志文件（如果存在）
# 查看ClaudeCode或MCP服务的错误日志
```

#### 2. 数据库连接失败
**症状**: mysql_connect工具返回连接错误

**解决步骤**:
```bash
# 1. 检查数据库服务是否运行
mysql -h localhost -u your_username -p

# 2. 验证环境变量配置
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER

# 3. 检查网络连通性
telnet localhost 3306

# 4. 验证用户权限
SHOW GRANTS FOR 'your_username'@'localhost';
```

#### 3. 编译错误
**症状**: npm run build失败

**解决方案**:
```bash
# 确保Node.js版本 >= 18.0.0
node --version

# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查TypeScript版本
npx tsc --version

# 重新构建
npm run clean && npm run build
```

#### 4. 测试失败
**症状**: npm test失败

**解决方案**:
```bash
# 检查Jest配置
cat jest.config.cjs

# 确保所有依赖已安装
npm install

# 运行单个测试文件
npm run test:basic

# 查看详细错误信息
npm test -- --verbose
```

#### 5. ClaudeCode中MCP工具响应超时
**症状**: 工具调用长时间无响应

**解决方案**:
```bash
# 检查数据库查询性能
# 使用EXPLAIN分析慢查询

# 增加超时时间配置
# 在环境变量中设置:
export QUERY_TIMEOUT=30000

# 检查数据库连接池状态
# 查看是否有连接泄露
```

#### 6. 权限和安全问题
**症状**: 某些查询被拒绝执行

**解决方案**:
```bash
# 检查SQL安全过滤规则
# 查看src/query-handlers.ts中的安全检查

# 确认用户具有必要的数据库权限
SHOW GRANTS FOR 'your_username'@'localhost';

# 检查表级别的访问权限
SELECT * FROM information_schema.table_privileges;
```

### ClaudeCode集成调试

#### 启用详细日志
在MCP服务配置中启用调试模式:
```json
{
  "mcpServers": {
    "mysql-query": {
      "command": "mcp-mysql-service", 
      "env": {
        "DB_HOST": "localhost",
        "LOG_LEVEL": "debug",
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

#### 手动测试MCP服务
```bash
# 直接启动MCP服务进行测试
cd mcp-mysql-service
NODE_ENV=development npm start

# 检查服务是否正常响应
curl -X POST http://localhost:3000/health

# 模拟MCP协议调用
# 使用MCP客户端工具测试
```

#### 验证配置文件
```bash
# 使用jq验证JSON配置格式
cat claude_desktop_config.json | jq .

# 检查配置文件权限
ls -la claude_desktop_config.json

# 确保配置文件可读
chmod 644 claude_desktop_config.json
```

## 📝 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.7+
- **协议**: MCP (Model Context Protocol)
- **数据库**: MySQL 8.0+
- **测试**: Jest
- **构建**: TypeScript Compiler
- **容器**: Docker

## 🎯 后续优化方向

虽然当前版本已经是最小可用版本，但仍有优化空间：

1. **性能优化**
   - 连接池优化
   - 查询缓存机制
   - 结果压缩

2. **安全增强**
   - 数据脱敏功能
   - 更细粒度的权限控制
   - 审计日志

3. **功能扩展**
   - 查询性能分析
   - 执行计划查看
   - 索引建议

4. **监控和日志**
   - 性能指标收集
   - 健康检查
   - 结构化日志

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交Issue和Pull Request来改进这个项目。

---

**最小可用版本特点**：
- ✅ 简化但完整的实现
- ✅ 核心功能全部可用
- ✅ 易于理解和维护
- ✅ 具备生产就绪的基础架构