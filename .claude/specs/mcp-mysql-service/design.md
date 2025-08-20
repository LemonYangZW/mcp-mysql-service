# MCP MySQL服务技术架构设计（务实版本）

## 1. 系统架构概述

### 1.1 整体架构设计（简化版）

```
┌─────────────────────────────────────────────────────────────┐
│                    ClaudeCode Environment                   │
├─────────────────────────────────────────────────────────────┤
│                    MCP Client (Built-in)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (JSON-RPC over stdio)
┌─────────────────────▼───────────────────────────────────────┐
│                 MCP MySQL Service (基础版)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   MCP Server  │  │ Query Engine │  │ Basic Security  │   │
│  │   (简化)      │  │   (基础)     │  │   (必要)        │   │
│  └───────┬───────┘  └──────┬───────┘  └─────────┬───────┘   │
│          │                 │                    │           │
│  ┌───────▼─────────────────▼────────────────────▼───────┐   │
│  │              Basic Connection Manager               │   │
│  └─────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────┘
                              │ MySQL Protocol (基础连接)
┌─────────────────────────────▼───────────────────────────────┐
│                    MySQL 8.0 Database                      │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ ruoyi-vue-  │  │   Tables    │                          │
│  │    pro      │  │    Data     │                          │
│  │  Database   │  │             │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件架构（简化版）

#### 1.2.1 基础MCP服务器
```typescript
// 简化的MCP服务器接口
interface BasicMCPServer {
  tools: Map<string, BasicTool>;
  connectionManager: SimpleConnectionManager;
  
  // 基础MCP协议处理
  handleToolCall(toolName: string, parameters: any): Promise<any>;
  registerTool(tool: BasicTool): void;
  start(): Promise<void>;
}
```

#### 1.2.2 简单连接管理
```typescript
// 基础连接管理器
interface SimpleConnectionManager {
  connection: mysql.Connection | null;
  config: DatabaseConfig;
  
  // 基础连接管理
  connect(config: DatabaseConfig): Promise<mysql.Connection>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

### 1.3 技术栈选择（最小集合）

#### 1.3.1 核心技术栈
- **运行环境**: Node.js 18+
- **开发语言**: TypeScript 5.0+（宽松模式）
- **MCP协议库**: @modelcontextprotocol/sdk
- **数据库驱动**: mysql2
- **日志系统**: winston

#### 1.3.2 依赖最小化
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "mysql2": "^3.6.0",
    "winston": "^3.8.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "jest": "^29.0.0"
  }
}
```

## 2. 详细技术设计（简化版）

### 2.1 MCP协议实现设计

#### 2.1.1 基础工具定义
```typescript
// 最小化的MCP工具集
const basicMysqlTools = [
  {
    name: "mysql_connect",
    description: "连接到MySQL数据库",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string" },
        port: { type: "number", default: 3306 },
        database: { type: "string" },
        username: { type: "string" },
        password: { type: "string" }
      },
      required: ["host", "database", "username", "password"]
    }
  },
  {
    name: "mysql_list_tables",
    description: "获取数据库表列表",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "表名匹配模式" }
      }
    }
  },
  {
    name: "mysql_describe_table",
    description: "查询表结构信息",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string" }
      },
      required: ["tableName"]
    }
  },
  {
    name: "mysql_query",
    description: "执行安全的只读查询",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 100, maximum: 1000 }
      },
      required: ["query"]
    }
  }
];
```

#### 2.1.2 响应格式（统一简化）
```typescript
// 统一的简单响应格式
interface SimpleResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### 2.2 数据库连接设计（基础版）

#### 2.2.1 简单连接管理
```typescript
// 基础连接管理器实现
class SimpleConnectionManager {
  private connection: mysql.Connection | null = null;
  private config: DatabaseConfig | null = null;
  
  async connect(config: DatabaseConfig): Promise<mysql.Connection> {
    try {
      this.config = config;
      this.connection = mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        charset: 'utf8mb4'
      });
      
      await this.connection.promise().connect();
      return this.connection;
    } catch (error) {
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.promise().end();
      this.connection = null;
    }
  }
  
  isConnected(): boolean {
    return this.connection !== null;
  }
  
  getConnection(): mysql.Connection {
    if (!this.connection) {
      throw new Error('数据库未连接');
    }
    return this.connection;
  }
}
```

#### 2.2.2 基础查询执行
```typescript
// 简单查询执行器
class SimpleQueryExecutor {
  constructor(private connectionManager: SimpleConnectionManager) {}
  
  // 基础安全查询执行
  async executeQuery(sql: string): Promise<any[]> {
    // 基础安全检查
    this.validateQuery(sql);
    
    const connection = this.connectionManager.getConnection();
    try {
      const [rows] = await connection.promise().execute(sql);
      return rows as any[];
    } catch (error) {
      throw new Error(`查询执行失败: ${error.message}`);
    }
  }
  
  // 基础安全验证
  private validateQuery(sql: string): void {
    const normalizedSql = sql.trim().toLowerCase();
    
    // 只允许SELECT查询
    if (!normalizedSql.startsWith('select')) {
      throw new Error('只允许执行SELECT查询');
    }
    
    // 基础危险关键词检查
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter',
      'truncate', 'replace'
    ];
    
    for (const keyword of forbiddenKeywords) {
      if (normalizedSql.includes(keyword)) {
        throw new Error(`查询包含禁止的关键词: ${keyword}`);
      }
    }
  }
}
```

### 2.3 表结构查询设计（基础版）

#### 2.3.1 简单表结构查询
```typescript
// 基础表结构查询器
class SimpleTableQuery {
  constructor(private executor: SimpleQueryExecutor) {}
  
  // 获取表列表
  async getTableList(pattern?: string): Promise<string[]> {
    let sql = `
      SELECT TABLE_NAME as tableName
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `;
    
    if (pattern) {
      sql += ` AND TABLE_NAME LIKE '%${pattern}%'`;
    }
    
    sql += ' ORDER BY TABLE_NAME';
    
    const rows = await this.executor.executeQuery(sql);
    return rows.map(row => row.tableName);
  }
  
  // 获取表结构
  async getTableStructure(tableName: string): Promise<any> {
    const sql = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_COMMENT as comment
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columns = await this.executor.executeQuery(sql);
    
    return {
      table_name: tableName,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        comment: col.comment || ''
      }))
    };
  }
}
```

### 2.4 MCP工具实现（基础版）

#### 2.4.1 基础MySQL工具集
```typescript
// 基础MySQL工具实现
class BasicMySQLTools {
  private connectionManager = new SimpleConnectionManager();
  private queryExecutor = new SimpleQueryExecutor(this.connectionManager);
  private tableQuery = new SimpleTableQuery(this.queryExecutor);
  
  // 连接工具
  async mysql_connect(params: any): Promise<SimpleResponse> {
    try {
      await this.connectionManager.connect(params);
      return {
        success: true,
        data: { message: '数据库连接成功' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 表列表工具
  async mysql_list_tables(params: any): Promise<SimpleResponse> {
    try {
      const tables = await this.tableQuery.getTableList(params.pattern);
      return {
        success: true,
        data: { tables },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 表结构工具
  async mysql_describe_table(params: any): Promise<SimpleResponse> {
    try {
      const structure = await this.tableQuery.getTableStructure(params.tableName);
      return {
        success: true,
        data: structure,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // 查询工具
  async mysql_query(params: any): Promise<SimpleResponse> {
    try {
      // 添加LIMIT限制
      let sql = params.query;
      const limit = params.limit || 100;
      
      if (!sql.toLowerCase().includes('limit')) {
        sql += ` LIMIT ${limit}`;
      }
      
      const rows = await this.queryExecutor.executeQuery(sql);
      return {
        success: true,
        data: { rows, count: rows.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

### 2.5 基础类型定义

#### 2.5.1 核心类型（简化版）
```typescript
// 基础类型定义
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

interface SimpleResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface BasicTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<SimpleResponse>;
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  comment: string;
}

interface TableStructure {
  table_name: string;
  columns: TableColumn[];
}
```

### 2.6 错误处理设计（简化版）

#### 2.6.1 基础错误处理
```typescript
// 简单错误处理
class SimpleErrorHandler {
  static handleError(error: any): SimpleResponse {
    return {
      success: false,
      error: error.message || '未知错误',
      timestamp: new Date().toISOString()
    };
  }
  
  static handleSuccess<T>(data: T): SimpleResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 2.7 配置管理（简化版）

#### 2.7.1 基础配置
```typescript
// 简单配置管理
interface Config {
  database: DatabaseConfig;
  server: {
    name: string;
    version: string;
  };
  security: {
    maxResultRows: number;
  };
}

class SimpleConfigManager {
  private static config: Config = {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'ruoyi-vue-pro',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    },
    server: {
      name: 'mysql-mcp-service',
      version: '1.0.0'
    },
    security: {
      maxResultRows: 1000
    }
  };
  
  static getConfig(): Config {
    return this.config;
  }
}
```

## 3. 项目结构设计（简化版）

### 3.1 目录结构
```
mcp-mysql-service/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── mcp-server.ts         # MCP服务器实现
│   ├── connection-manager.ts # 连接管理器
│   ├── query-executor.ts     # 查询执行器
│   ├── table-query.ts        # 表查询器
│   ├── mysql-tools.ts        # MySQL工具集
│   ├── types.ts              # 类型定义
│   └── config.ts             # 配置管理
├── tests/
│   ├── connection.test.ts    # 连接测试
│   ├── query.test.ts         # 查询测试
│   └── tools.test.ts         # 工具测试
├── config/
│   └── default.json          # 默认配置
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript配置
├── jest.config.js            # 测试配置
├── Dockerfile                # Docker配置
└── README.md                 # 项目说明
```

### 3.2 TypeScript配置（宽松版）
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3.3 基础测试配置
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.(test|spec).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
```

### 3.4 Docker配置（基础版）
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 编译TypeScript
RUN npm run build

# 暴露端口（如果需要）
EXPOSE 3000

# 健康检查（基础版）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check OK')" || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
```

## 4. 部署和运维（简化版）

### 4.1 环境变量配置
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ruoyi-vue-pro
DB_USER=root
DB_PASSWORD=your_password

# 服务配置
NODE_ENV=production
LOG_LEVEL=info
```

### 4.2 基础启动脚本
```bash
#!/bin/bash
echo "启动MCP MySQL服务..."

# 检查环境变量
if [ -z "$DB_PASSWORD" ]; then
    echo "错误: 请设置DB_PASSWORD环境变量"
    exit 1
fi

# 编译项目
npm run build

# 启动服务
npm start
```

### 4.3 基础日志配置
```typescript
// 简单日志配置
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

export default logger;
```

## 5. 暂时移除的高级功能

以下功能在当前版本中暂时移除，确保基础功能可用：

### 5.1 移除的复杂功能
- ~~连接池管理~~ → 使用单一连接
- ~~SQL执行计划分析~~ → 基础查询执行
- ~~智能缓存系统~~ → 无缓存
- ~~性能监控和分析~~ → 基础日志记录
- ~~数据质量检查~~ → 基础查询验证
- ~~复杂的类型系统~~ → 简化类型定义
- ~~高级错误处理~~ → 基础异常捕获

### 5.2 移除的部署复杂性
- ~~多阶段Docker构建~~ → 单阶段构建
- ~~Kubernetes部署~~ → 基础Docker运行
- ~~CI/CD流水线~~ → 手动部署
- ~~监控和告警~~ → 基础日志

## 6. 后续版本规划

### 6.1 V1.1 - 稳定化
- 添加连接池支持
- 改进错误处理
- 增加基础测试覆盖

### 6.2 V1.2 - 功能增强
- 添加数据统计分析
- 实现基础缓存
- 改进安全机制

### 6.3 V2.0 - 高级功能
- SQL执行计划分析
- 性能监控
- 智能缓存系统

---

*本设计方案采用务实的渐进式方法，优先确保核心功能可用，为后续功能扩展提供坚实基础。*

## 2. 详细技术设计

### 2.1 MCP协议实现设计

#### 2.1.1 工具定义结构
```typescript
// MCP工具定义
const mysqlTools: MCPToolDefinition[] = [
  {
    name: "mysql_connect",
    description: "连接到MySQL数据库",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "数据库主机地址" },
        port: { type: "number", default: 3306, description: "数据库端口" },
        database: { type: "string", description: "数据库名称" },
        username: { type: "string", description: "用户名" },
        password: { type: "string", description: "密码" },
        ssl: { type: "boolean", default: false, description: "是否使用SSL" }
      },
      required: ["host", "database", "username", "password"]
    }
  },
  {
    name: "mysql_list_tables",
    description: "获取数据库表列表",
    inputSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "表名匹配模式" },
        includeViews: { type: "boolean", default: false, description: "是否包含视图" },
        includeSystem: { type: "boolean", default: false, description: "是否包含系统表" }
      }
    }
  },
  {
    name: "mysql_describe_table",
    description: "查询表结构详细信息",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string", description: "表名" },
        includeIndexes: { type: "boolean", default: true, description: "是否包含索引信息" },
        includeForeignKeys: { type: "boolean", default: true, description: "是否包含外键信息" },
        includeConstraints: { type: "boolean", default: true, description: "是否包含约束信息" }
      },
      required: ["tableName"]
    }
  },
  {
    name: "mysql_table_stats",
    description: "获取表统计信息",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string", description: "表名" },
        includeDataSample: { type: "boolean", default: false, description: "是否包含数据样本" },
        sampleSize: { type: "number", default: 10, description: "样本数据行数" }
      },
      required: ["tableName"]
    }
  },
  {
    name: "mysql_analyze_column",
    description: "分析字段数据分布",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string", description: "表名" },
        columnName: { type: "string", description: "字段名" },
        analysisType: { 
          type: "string", 
          enum: ["distribution", "nulls", "unique", "range"],
          description: "分析类型" 
        }
      },
      required: ["tableName", "columnName", "analysisType"]
    }
  },
  {
    name: "mysql_execute_safe_query",
    description: "执行安全的只读查询",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL查询语句（仅支持SELECT）" },
        limit: { type: "number", default: 100, maximum: 1000, description: "结果行数限制" }
      },
      required: ["query"]
    }
  }
];
```

#### 2.1.2 响应格式标准
```typescript
// 统一响应格式
interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    executionTime: number;
    queryInfo?: {
      sql?: string;
      affectedRows?: number;
    };
  };
}

// 表结构响应格式
interface TableStructureResponse {
  tableName: string;
  tableComment: string;
  engine: string;
  charset: string;
  collation: string;
  createTime: string;
  updateTime?: string;
  columns: ColumnInfo[];
  indexes?: IndexInfo[];
  foreignKeys?: ForeignKeyInfo[];
  constraints?: ConstraintInfo[];
}

// 字段信息格式
interface ColumnInfo {
  columnName: string;
  dataType: string;
  maxLength?: number;
  numericPrecision?: number;
  numericScale?: number;
  isNullable: boolean;
  columnDefault?: string;
  columnComment: string;
  extra: string; // auto_increment, on update CURRENT_TIMESTAMP等
  position: number;
}
```

### 2.2 数据库连接管理设计

#### 2.2.1 连接池配置
```typescript
// 连接池配置
interface ConnectionPoolConfig {
  // 基础连接配置
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  
  // SSL配置
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  
  // 连接池配置
  connectionLimit: number; // 最大连接数，默认10
  queueLimit: number; // 队列限制，默认0（无限制）
  acquireTimeout: number; // 获取连接超时，默认60秒
  timeout: number; // 查询超时，默认60秒
  reconnect: boolean; // 自动重连，默认true
  
  // 字符集配置
  charset: string; // 默认'UTF8MB4_UNICODE_CI'
  timezone: string; // 默认'local'
  
  // 安全配置
  multipleStatements: boolean; // 禁用多语句，默认false
  typeCast: boolean; // 类型转换，默认true
}

// 连接管理器实现
class DatabaseConnectionManager {
  private pool: mysql.Pool;
  private config: ConnectionPoolConfig;
  private isConnected: boolean = false;
  
  constructor(config: ConnectionPoolConfig) {
    this.config = this.validateConfig(config);
    this.createPool();
  }
  
  private createPool(): void {
    this.pool = mysql.createPool({
      ...this.config,
      // 安全设置
      multipleStatements: false, // 禁用多语句执行
      typeCast: this.typeCastFunction, // 自定义类型转换
    });
    
    // 连接事件监听
    this.pool.on('connection', this.onConnection.bind(this));
    this.pool.on('error', this.onError.bind(this));
  }
  
  // 获取连接
  async getConnection(): Promise<mysql.PoolConnection> {
    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      throw new DatabaseError('CONNECTION_FAILED', '获取数据库连接失败', error);
    }
  }
  
  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const connection = await this.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

#### 2.2.2 查询执行管理
```typescript
// 查询执行器
class QueryExecutor {
  constructor(private connectionManager: DatabaseConnectionManager) {}
  
  // 安全查询执行
  async executeSecureQuery(sql: string, params: any[] = []): Promise<QueryResult> {
    // 查询安全检查
    this.validateQuery(sql);
    
    const connection = await this.connectionManager.getConnection();
    try {
      const startTime = Date.now();
      const [rows, fields] = await connection.execute(sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        rows: rows as any[],
        fields: fields as mysql.FieldPacket[],
        executionTime,
        rowCount: Array.isArray(rows) ? rows.length : 0
      };
    } finally {
      connection.release();
    }
  }
  
  // 查询安全验证
  private validateQuery(sql: string): void {
    const normalizedSql = sql.trim().toLowerCase();
    
    // 只允许SELECT查询
    if (!normalizedSql.startsWith('select')) {
      throw new SecurityError('UNSAFE_QUERY', '只允许执行SELECT查询');
    }
    
    // 禁止的关键词检查
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter',
      'truncate', 'replace', 'merge', 'call', 'execute',
      'load_file', 'into outfile', 'into dumpfile'
    ];
    
    for (const keyword of forbiddenKeywords) {
      if (normalizedSql.includes(keyword)) {
        throw new SecurityError('FORBIDDEN_KEYWORD', `查询包含禁止的关键词: ${keyword}`);
      }
    }
    
    // 查询复杂度检查
    this.validateQueryComplexity(sql);
  }
  
  // 查询复杂度验证
  private validateQueryComplexity(sql: string): void {
    const subqueryCount = (sql.match(/\bselect\b/gi) || []).length - 1;
    if (subqueryCount > 3) {
      throw new SecurityError('QUERY_TOO_COMPLEX', '查询过于复杂，子查询数量超过限制');
    }
    
    const joinCount = (sql.match(/\bjoin\b/gi) || []).length;
    if (joinCount > 5) {
      throw new SecurityError('QUERY_TOO_COMPLEX', '查询过于复杂，JOIN数量超过限制');
    }
  }
}
```

### 2.3 查询引擎设计

#### 2.3.1 表结构查询
```typescript
// 表结构查询器
class TableStructureQuery {
  constructor(private executor: QueryExecutor) {}
  
  // 获取表列表
  async getTableList(options: {
    pattern?: string;
    includeViews?: boolean;
    includeSystem?: boolean;
  } = {}): Promise<TableInfo[]> {
    let sql = `
      SELECT 
        TABLE_NAME as tableName,
        TABLE_TYPE as tableType,
        ENGINE as engine,
        TABLE_ROWS as estimatedRows,
        DATA_LENGTH as dataLength,
        INDEX_LENGTH as indexLength,
        TABLE_COMMENT as tableComment,
        CREATE_TIME as createTime,
        UPDATE_TIME as updateTime
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    
    const params: any[] = [];
    
    // 模式匹配
    if (options.pattern) {
      sql += ' AND TABLE_NAME LIKE ?';
      params.push(`%${options.pattern}%`);
    }
    
    // 是否包含视图
    if (!options.includeViews) {
      sql += " AND TABLE_TYPE = 'BASE TABLE'";
    }
    
    // 是否包含系统表
    if (!options.includeSystem) {
      sql += " AND TABLE_NAME NOT LIKE 'information_schema%'";
      sql += " AND TABLE_NAME NOT LIKE 'performance_schema%'";
      sql += " AND TABLE_NAME NOT LIKE 'mysql%'";
      sql += " AND TABLE_NAME NOT LIKE 'sys%'";
    }
    
    sql += ' ORDER BY TABLE_NAME';
    
    const result = await this.executor.executeSecureQuery(sql, params);
    return result.rows.map(row => this.formatTableInfo(row));
  }
  
  // 获取表结构详情
  async getTableStructure(tableName: string, options: {
    includeIndexes?: boolean;
    includeForeignKeys?: boolean;
    includeConstraints?: boolean;
  } = {}): Promise<TableStructureResponse> {
    // 验证表名
    await this.validateTableExists(tableName);
    
    // 并行查询多个信息
    const [
      tableInfo,
      columns,
      indexes,
      foreignKeys,
      constraints
    ] = await Promise.all([
      this.getTableBasicInfo(tableName),
      this.getTableColumns(tableName),
      options.includeIndexes ? this.getTableIndexes(tableName) : Promise.resolve([]),
      options.includeForeignKeys ? this.getTableForeignKeys(tableName) : Promise.resolve([]),
      options.includeConstraints ? this.getTableConstraints(tableName) : Promise.resolve([])
    ]);
    
    return {
      ...tableInfo,
      columns,
      indexes: options.includeIndexes ? indexes : undefined,
      foreignKeys: options.includeForeignKeys ? foreignKeys : undefined,
      constraints: options.includeConstraints ? constraints : undefined
    };
  }
  
  // 获取表基本信息
  private async getTableBasicInfo(tableName: string): Promise<Partial<TableStructureResponse>> {
    const sql = `
      SELECT 
        TABLE_NAME as tableName,
        TABLE_COMMENT as tableComment,
        ENGINE as engine,
        TABLE_COLLATION as collation,
        CREATE_TIME as createTime,
        UPDATE_TIME as updateTime
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `;
    
    const result = await this.executor.executeSecureQuery(sql, [tableName]);
    if (result.rows.length === 0) {
      throw new DataError('TABLE_NOT_FOUND', `表 ${tableName} 不存在`);
    }
    
    const row = result.rows[0];
    return {
      tableName: row.tableName,
      tableComment: row.tableComment || '',
      engine: row.engine,
      charset: row.collation?.split('_')[0] || 'utf8mb4',
      collation: row.collation,
      createTime: row.createTime?.toISOString(),
      updateTime: row.updateTime?.toISOString()
    };
  }
  
  // 获取表字段信息
  private async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const sql = `
      SELECT 
        COLUMN_NAME as columnName,
        DATA_TYPE as dataType,
        CHARACTER_MAXIMUM_LENGTH as maxLength,
        NUMERIC_PRECISION as numericPrecision,
        NUMERIC_SCALE as numericScale,
        IS_NULLABLE as isNullable,
        COLUMN_DEFAULT as columnDefault,
        COLUMN_COMMENT as columnComment,
        EXTRA as extra,
        ORDINAL_POSITION as position
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    
    const result = await this.executor.executeSecureQuery(sql, [tableName]);
    return result.rows.map(row => ({
      columnName: row.columnName,
      dataType: row.dataType,
      maxLength: row.maxLength,
      numericPrecision: row.numericPrecision,
      numericScale: row.numericScale,
      isNullable: row.isNullable === 'YES',
      columnDefault: row.columnDefault,
      columnComment: row.columnComment || '',
      extra: row.extra || '',
      position: row.position
    }));
  }
}
```

#### 2.3.2 数据分析查询
```typescript
// 数据分析查询器
class DataAnalysisQuery {
  constructor(private executor: QueryExecutor) {}
  
  // 获取表统计信息
  async getTableStats(tableName: string, options: {
    includeDataSample?: boolean;
    sampleSize?: number;
  } = {}): Promise<TableStats> {
    await this.validateTableExists(tableName);
    
    // 并行查询统计信息
    const [
      basicStats,
      columnStats,
      dataSample
    ] = await Promise.all([
      this.getBasicTableStats(tableName),
      this.getColumnStatistics(tableName),
      options.includeDataSample ? this.getDataSample(tableName, options.sampleSize || 10) : Promise.resolve([])
    ]);
    
    return {
      ...basicStats,
      columnStats,
      dataSample: options.includeDataSample ? dataSample : undefined
    };
  }
  
  // 获取基本统计信息
  private async getBasicTableStats(tableName: string): Promise<Partial<TableStats>> {
    const sql = `
      SELECT 
        COUNT(*) as totalRows,
        ROUND(AVG(LENGTH(CONCAT_WS('', ${await this.getAllColumnNames(tableName)})))) as avgRowSize
      FROM ${mysql.escapeId(tableName)}
    `;
    
    const result = await this.executor.executeSecureQuery(sql);
    const row = result.rows[0];
    
    return {
      totalRows: parseInt(row.totalRows),
      avgRowSize: parseInt(row.avgRowSize) || 0,
      lastAnalyzed: new Date().toISOString()
    };
  }
  
  // 分析字段数据
  async analyzeColumn(tableName: string, columnName: string, analysisType: string): Promise<ColumnAnalysis> {
    await this.validateTableExists(tableName);
    await this.validateColumnExists(tableName, columnName);
    
    switch (analysisType) {
      case 'distribution':
        return this.analyzeColumnDistribution(tableName, columnName);
      case 'nulls':
        return this.analyzeColumnNulls(tableName, columnName);
      case 'unique':
        return this.analyzeColumnUnique(tableName, columnName);
      case 'range':
        return this.analyzeColumnRange(tableName, columnName);
      default:
        throw new ValidationError('INVALID_ANALYSIS_TYPE', `不支持的分析类型: ${analysisType}`);
    }
  }
  
  // 分析字段值分布
  private async analyzeColumnDistribution(tableName: string, columnName: string): Promise<ColumnAnalysis> {
    const sql = `
      SELECT 
        ${mysql.escapeId(columnName)} as value,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${mysql.escapeId(tableName)}), 2) as percentage
      FROM ${mysql.escapeId(tableName)}
      WHERE ${mysql.escapeId(columnName)} IS NOT NULL
      GROUP BY ${mysql.escapeId(columnName)}
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const result = await this.executor.executeSecureQuery(sql);
    
    return {
      analysisType: 'distribution',
      columnName,
      tableName,
      result: {
        distribution: result.rows,
        totalUniqueValues: result.rows.length
      }
    };
  }
}
```

### 2.4 安全机制设计

#### 2.4.1 查询安全验证
```typescript
// 安全验证器
class SecurityValidator {
  private static readonly FORBIDDEN_KEYWORDS = [
    // DML操作
    'insert', 'update', 'delete', 'replace', 'merge',
    // DDL操作
    'create', 'drop', 'alter', 'truncate', 'rename',
    // 权限操作
    'grant', 'revoke', 'set password',
    // 系统操作
    'load_file', 'into outfile', 'into dumpfile',
    // 存储过程
    'call', 'execute', 'prepare',
    // 事务控制
    'start transaction', 'commit', 'rollback',
    // 变量操作
    'set @', 'set session', 'set global'
  ];
  
  private static readonly SENSITIVE_TABLES = [
    'information_schema', 'performance_schema', 'mysql', 'sys'
  ];
  
  private static readonly SENSITIVE_COLUMNS = [
    'password', 'passwd', 'pwd', 'secret', 'token',
    'key', 'salt', 'hash', 'credential', 'id_card',
    'identity_card', 'ssn', 'social_security'
  ];
  
  // 验证查询安全性
  static validateQuery(sql: string): void {
    const normalizedSql = sql.trim().toLowerCase();
    
    // 检查是否为SELECT查询
    if (!normalizedSql.startsWith('select')) {
      throw new SecurityError('NON_SELECT_QUERY', '只允许执行SELECT查询');
    }
    
    // 检查禁止关键词
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (normalizedSql.includes(keyword)) {
        throw new SecurityError('FORBIDDEN_KEYWORD', `查询包含禁止的关键词: ${keyword}`);
      }
    }
    
    // 检查查询复杂度
    this.validateQueryComplexity(sql);
    
    // 检查敏感表访问
    this.validateTableAccess(sql);
  }
  
  // 验证查询复杂度
  private static validateQueryComplexity(sql: string): void {
    const normalizedSql = sql.toLowerCase();
    
    // 子查询数量限制
    const subqueryCount = (normalizedSql.match(/\bselect\b/g) || []).length - 1;
    if (subqueryCount > 3) {
      throw new SecurityError('QUERY_TOO_COMPLEX', '子查询数量超过限制(3个)');
    }
    
    // JOIN数量限制
    const joinCount = (normalizedSql.match(/\bjoin\b/g) || []).length;
    if (joinCount > 5) {
      throw new SecurityError('QUERY_TOO_COMPLEX', 'JOIN数量超过限制(5个)');
    }
    
    // UNION数量限制
    const unionCount = (normalizedSql.match(/\bunion\b/g) || []).length;
    if (unionCount > 2) {
      throw new SecurityError('QUERY_TOO_COMPLEX', 'UNION数量超过限制(2个)');
    }
  }
  
  // 数据脱敏处理
  static sanitizeData(data: any[], columns: mysql.FieldPacket[]): any[] {
    return data.map(row => {
      const sanitizedRow = { ...row };
      
      columns.forEach(column => {
        const columnName = column.name.toLowerCase();
        
        // 检查是否为敏感字段
        if (this.isSensitiveColumn(columnName)) {
          sanitizedRow[column.name] = this.maskSensitiveData(row[column.name], columnName);
        }
      });
      
      return sanitizedRow;
    });
  }
  
  // 检查是否为敏感字段
  private static isSensitiveColumn(columnName: string): boolean {
    return this.SENSITIVE_COLUMNS.some(sensitive => 
      columnName.includes(sensitive)
    );
  }
  
  // 敏感数据掩码处理
  private static maskSensitiveData(value: any, columnType: string): string {
    if (value === null || value === undefined) {
      return value;
    }
    
    const str = String(value);
    
    if (columnType.includes('password') || columnType.includes('pwd')) {
      return '******';
    }
    
    if (columnType.includes('id_card') || columnType.includes('identity')) {
      return str.length > 4 ? str.substring(0, 4) + '****' + str.substring(str.length - 4) : '****';
    }
    
    if (columnType.includes('phone') || columnType.includes('mobile')) {
      return str.length > 7 ? str.substring(0, 3) + '****' + str.substring(str.length - 4) : '****';
    }
    
    // 默认掩码处理
    return str.length > 6 ? str.substring(0, 3) + '***' + str.substring(str.length - 3) : '***';
  }
}
```

#### 2.4.2 访问控制
```typescript
// 访问控制管理器
class AccessController {
  private allowedTables: Set<string> = new Set();
  private deniedTables: Set<string> = new Set();
  private maxQueryTime: number = 30000; // 30秒
  private maxResultRows: number = 1000;
  
  constructor(config: AccessControlConfig) {
    this.allowedTables = new Set(config.allowedTables || []);
    this.deniedTables = new Set(config.deniedTables || []);
    this.maxQueryTime = config.maxQueryTime || 30000;
    this.maxResultRows = config.maxResultRows || 1000;
  }
  
  // 检查表访问权限
  checkTableAccess(tableName: string): boolean {
    // 如果有白名单，必须在白名单中
    if (this.allowedTables.size > 0 && !this.allowedTables.has(tableName)) {
      throw new SecurityError('TABLE_ACCESS_DENIED', `表 ${tableName} 不在允许访问列表中`);
    }
    
    // 检查黑名单
    if (this.deniedTables.has(tableName)) {
      throw new SecurityError('TABLE_ACCESS_DENIED', `表 ${tableName} 在禁止访问列表中`);
    }
    
    return true;
  }
  
  // 限制查询结果
  limitQueryResult(query: string): string {
    const normalizedQuery = query.trim();
    
    // 检查是否已有LIMIT子句
    if (!/\blimit\s+\d+/i.test(normalizedQuery)) {
      return `${normalizedQuery} LIMIT ${this.maxResultRows}`;
    }
    
    // 检查LIMIT值是否超过限制
    const limitMatch = normalizedQuery.match(/\blimit\s+(\d+)/i);
    if (limitMatch) {
      const limitValue = parseInt(limitMatch[1]);
      if (limitValue > this.maxResultRows) {
        return normalizedQuery.replace(/\blimit\s+\d+/i, `LIMIT ${this.maxResultRows}`);
      }
    }
    
    return normalizedQuery;
  }
}
```

### 2.5 错误处理设计

#### 2.5.1 错误类型定义
```typescript
// 错误基类
abstract class MCPError extends Error {
  abstract readonly code: string;
  abstract readonly type: string;
  
  constructor(
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
  
  toMCPError(): MCPErrorResponse {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      details: this.details
    };
  }
}

// 数据库连接错误
class DatabaseError extends MCPError {
  readonly type = 'DATABASE_ERROR';
  
  constructor(
    public readonly code: string,
    message: string,
    details?: any
  ) {
    super(message, details);
  }
}

// 安全错误
class SecurityError extends MCPError {
  readonly type = 'SECURITY_ERROR';
  
  constructor(
    public readonly code: string,
    message: string,
    details?: any
  ) {
    super(message, details);
  }
}

// 验证错误
class ValidationError extends MCPError {
  readonly type = 'VALIDATION_ERROR';
  
  constructor(
    public readonly code: string,
    message: string,
    details?: any
  ) {
    super(message, details);
  }
}

// 数据错误
class DataError extends MCPError {
  readonly type = 'DATA_ERROR';
  
  constructor(
    public readonly code: string,
    message: string,
    details?: any
  ) {
    super(message, details);
  }
}
```

#### 2.5.2 统一错误处理器
```typescript
// 错误处理器
class ErrorHandler {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  // 处理工具调用错误
  handleToolError(error: any, toolName: string, parameters: any): MCPResponse {
    // 记录错误日志
    this.logger.error('Tool execution failed', {
      toolName,
      parameters,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    // 转换为MCP错误响应
    if (error instanceof MCPError) {
      return {
        success: false,
        error: error.toMCPError(),
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      };
    }
    
    // 处理MySQL错误
    if (error.code?.startsWith('ER_')) {
      return {
        success: false,
        error: {
          code: 'MYSQL_ERROR',
          message: this.translateMySQLError(error),
          type: 'DATABASE_ERROR',
          details: {
            mysqlCode: error.code,
            sqlState: error.sqlState
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      };
    }
    
    // 处理未知错误
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: '发生未知错误，请检查日志',
        type: 'SYSTEM_ERROR'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: 0
      }
    };
  }
  
  // 翻译MySQL错误信息
  private translateMySQLError(error: any): string {
    const errorMessages: Record<string, string> = {
      'ER_ACCESS_DENIED_ERROR': '数据库访问被拒绝，请检查用户名和密码',
      'ER_BAD_DB_ERROR': '数据库不存在',
      'ER_NO_SUCH_TABLE': '表不存在',
      'ER_BAD_FIELD_ERROR': '字段不存在',
      'ER_PARSE_ERROR': 'SQL语法错误',
      'ER_LOCK_WAIT_TIMEOUT': '查询超时，请稍后重试',
      'ER_TOO_MANY_CONNECTIONS': '数据库连接数过多',
      'ECONNREFUSED': '无法连接到数据库服务器',
      'PROTOCOL_CONNECTION_LOST': '数据库连接丢失'
    };
    
    return errorMessages[error.code] || error.message || '数据库操作失败';
  }
}
```

### 2.6 TypeScript类型系统设计（新增）

#### 2.6.1 核心类型定义架构
```typescript
// 基础类型定义
namespace MCPMySQL {
  // 数据库连接相关类型
  export interface DatabaseConfig {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly username: string;
    readonly password: string;
    readonly ssl?: Readonly<SSLConfig>;
    readonly pool: Readonly<PoolConfig>;
  }

  export interface SSLConfig {
    readonly enabled: boolean;
    readonly rejectUnauthorized?: boolean;
    readonly ca?: string;
    readonly cert?: string;
    readonly key?: string;
  }

  export interface PoolConfig {
    readonly connectionLimit: number;
    readonly queueLimit: number;
    readonly acquireTimeout: number;
    readonly timeout: number;
    readonly reconnect: boolean;
  }

  // 查询结果类型
  export interface QueryResult<T = Record<string, unknown>> {
    readonly rows: ReadonlyArray<T>;
    readonly fields: ReadonlyArray<FieldInfo>;
    readonly executionTime: number;
    readonly rowCount: number;
    readonly metadata?: Readonly<QueryMetadata>;
  }

  export interface FieldInfo {
    readonly name: string;
    readonly type: MySQLDataType;
    readonly length?: number;
    readonly nullable: boolean;
    readonly defaultValue?: string | null;
    readonly comment: string;
    readonly extra: string;
  }

  // 表结构相关类型
  export interface TableStructure {
    readonly tableName: string;
    readonly tableComment: string;
    readonly engine: MySQLEngine;
    readonly charset: string;
    readonly collation: string;
    readonly createTime: string;
    readonly updateTime?: string;
    readonly columns: ReadonlyArray<ColumnInfo>;
    readonly indexes?: ReadonlyArray<IndexInfo>;
    readonly foreignKeys?: ReadonlyArray<ForeignKeyInfo>;
    readonly constraints?: ReadonlyArray<ConstraintInfo>;
  }

  export interface ColumnInfo {
    readonly columnName: string;
    readonly dataType: MySQLDataType;
    readonly maxLength?: number;
    readonly numericPrecision?: number;
    readonly numericScale?: number;
    readonly isNullable: boolean;
    readonly columnDefault?: string | null;
    readonly columnComment: string;
    readonly extra: string;
    readonly position: number;
  }

  export interface IndexInfo {
    readonly indexName: string;
    readonly columnNames: ReadonlyArray<string>;
    readonly indexType: IndexType;
    readonly isUnique: boolean;
    readonly isPrimary: boolean;
    readonly cardinality?: number;
    readonly subPart?: number;
    readonly comment: string;
  }

  // 安全相关类型
  export interface SecurityContext {
    readonly allowedTables: ReadonlySet<string>;
    readonly deniedTables: ReadonlySet<string>;
    readonly maxQueryTime: number;
    readonly maxResultRows: number;
    readonly enableDataMasking: boolean;
    readonly sensitiveColumns: ReadonlyArray<string>;
  }

  export interface MaskingRule {
    readonly columnPattern: RegExp;
    readonly maskingStrategy: MaskingStrategy;
    readonly preserveLength: boolean;
    readonly customMaskChar?: string;
  }

  // MCP协议相关类型
  export interface MCPToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: Readonly<JSONSchema>;
    readonly outputSchema?: Readonly<JSONSchema>;
  }

  export interface MCPRequest<T = Record<string, unknown>> {
    readonly toolName: string;
    readonly parameters: Readonly<T>;
    readonly requestId: string;
    readonly timestamp: string;
  }

  export interface MCPResponse<T = unknown> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: Readonly<MCPError>;
    readonly metadata: Readonly<ResponseMetadata>;
  }

  export interface MCPError {
    readonly code: string;
    readonly message: string;
    readonly type: ErrorType;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly stack?: string;
  }

  // 高级功能类型
  export interface ExecutionPlan {
    readonly query: string;
    readonly planSteps: ReadonlyArray<PlanStep>;
    readonly totalCost: number;
    readonly estimatedRows: number;
    readonly optimizationSuggestions: ReadonlyArray<string>;
  }

  export interface PlanStep {
    readonly step: number;
    readonly operation: OperationType;
    readonly table?: string;
    readonly index?: string;
    readonly cost: number;
    readonly rows: number;
    readonly details?: Readonly<Record<string, unknown>>;
  }

  export interface PerformanceMetrics {
    readonly avgQueryTime: number;
    readonly slowQueryCount: number;
    readonly indexHitRatio: number;
    readonly lockWaitTime: number;
    readonly connectionPoolUsage: number;
    readonly cacheHitRatio: number;
  }

  // 枚举类型
  export enum MySQLDataType {
    TINYINT = 'TINYINT',
    SMALLINT = 'SMALLINT',
    MEDIUMINT = 'MEDIUMINT',
    INT = 'INT',
    BIGINT = 'BIGINT',
    DECIMAL = 'DECIMAL',
    FLOAT = 'FLOAT',
    DOUBLE = 'DOUBLE',
    BIT = 'BIT',
    CHAR = 'CHAR',
    VARCHAR = 'VARCHAR',
    BINARY = 'BINARY',
    VARBINARY = 'VARBINARY',
    TINYTEXT = 'TINYTEXT',
    TEXT = 'TEXT',
    MEDIUMTEXT = 'MEDIUMTEXT',
    LONGTEXT = 'LONGTEXT',
    TINYBLOB = 'TINYBLOB',
    BLOB = 'BLOB',
    MEDIUMBLOB = 'MEDIUMBLOB',
    LONGBLOB = 'LONGBLOB',
    DATE = 'DATE',
    TIME = 'TIME',
    DATETIME = 'DATETIME',
    TIMESTAMP = 'TIMESTAMP',
    YEAR = 'YEAR',
    JSON = 'JSON',
    GEOMETRY = 'GEOMETRY'
  }

  export enum MySQLEngine {
    INNODB = 'InnoDB',
    MYISAM = 'MyISAM',
    MEMORY = 'MEMORY',
    CSV = 'CSV',
    ARCHIVE = 'ARCHIVE',
    FEDERATED = 'FEDERATED',
    BLACKHOLE = 'BLACKHOLE'
  }

  export enum IndexType {
    BTREE = 'BTREE',
    HASH = 'HASH',
    RTREE = 'RTREE',
    FULLTEXT = 'FULLTEXT'
  }

  export enum MaskingStrategy {
    ASTERISK = 'ASTERISK',
    HASH = 'HASH',
    PARTIAL = 'PARTIAL',
    RANDOM = 'RANDOM',
    CUSTOM = 'CUSTOM'
  }

  export enum ErrorType {
    DATABASE_ERROR = 'DATABASE_ERROR',
    SECURITY_ERROR = 'SECURITY_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    MCP_PROTOCOL_ERROR = 'MCP_PROTOCOL_ERROR'
  }

  export enum OperationType {
    TABLE_SCAN = 'TABLE_SCAN',
    INDEX_SCAN = 'INDEX_SCAN',
    INDEX_SEEK = 'INDEX_SEEK',
    NESTED_LOOP = 'NESTED_LOOP',
    HASH_JOIN = 'HASH_JOIN',
    MERGE_JOIN = 'MERGE_JOIN',
    SORT = 'SORT',
    GROUP_BY = 'GROUP_BY',
    AGGREGATE = 'AGGREGATE'
  }
}

// 工具函数类型
export type DatabaseConnection = mysql.PoolConnection;
export type QueryExecutionResult<T = Record<string, unknown>> = Promise<MCPMySQL.QueryResult<T>>;
export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };
export type AsyncHandler<T, R> = (input: T) => Promise<R>;
export type EventHandler<T> = (event: T) => void | Promise<void>;

// 条件类型和泛型约束
export type TableOperation<T extends string> = T extends `SELECT ${string}` ? T : never;
export type SecureQuery<T> = T extends MCPMySQL.SecurityContext ? T : never;
export type ValidatedInput<T> = T & { readonly __validated: true };

// 实用类型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

#### 2.6.2 类型安全保证机制
```typescript
// 运行时类型验证
import { z } from 'zod';

export const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
  ssl: z.object({
    enabled: z.boolean(),
    rejectUnauthorized: z.boolean().optional(),
    ca: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional()
  }).optional(),
  pool: z.object({
    connectionLimit: z.number().min(1).max(100),
    queueLimit: z.number().min(0),
    acquireTimeout: z.number().min(1000),
    timeout: z.number().min(1000),
    reconnect: z.boolean()
  })
}) satisfies z.ZodType<MCPMySQL.DatabaseConfig>;

// 类型守卫函数
export function isDatabaseConfig(obj: unknown): obj is MCPMySQL.DatabaseConfig {
  return DatabaseConfigSchema.safeParse(obj).success;
}

export function isTableStructure(obj: unknown): obj is MCPMySQL.TableStructure {
  return typeof obj === 'object' && obj !== null && 'tableName' in obj && 'columns' in obj;
}

export function isMCPError(obj: unknown): obj is MCPMySQL.MCPError {
  return typeof obj === 'object' && obj !== null && 'code' in obj && 'message' in obj && 'type' in obj;
}

// 类型断言函数
export function assertDatabaseConfig(obj: unknown): asserts obj is MCPMySQL.DatabaseConfig {
  if (!isDatabaseConfig(obj)) {
    throw new Error('Invalid database configuration');
  }
}

export function assertSecureQuery(query: string): asserts query is TableOperation<string> {
  if (!query.trim().toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }
}
```

### 2.7 测试架构设计（新增）

#### 2.7.1 测试金字塔结构
```
        /\
       /  \
      /E2E \     端到端测试 (10%)
     /______\
    /        \
   /Integration\   集成测试 (20%)
  /__________\
 /            \
/  Unit Tests  \  单元测试 (70%)
/______________\
```

#### 2.7.2 单元测试架构
```typescript
// 测试工具配置
interface TestConfig {
  readonly testEnvironment: 'node';
  readonly testMatch: string[];
  readonly collectCoverageFrom: string[];
  readonly coverageThreshold: {
    readonly global: {
      readonly branches: number;
      readonly functions: number;
      readonly lines: number;
      readonly statements: number;
    };
  };
  readonly setupFilesAfterEnv: string[];
  readonly testTimeout: number;
}

// 测试基类
abstract class BaseTest {
  protected readonly testDb: TestDatabaseManager;
  protected readonly mockMCP: MockMCPClient;
  
  abstract setUp(): Promise<void>;
  abstract tearDown(): Promise<void>;
  
  protected createTestData(tableName: string, data: Record<string, unknown>[]): Promise<void>;
  protected cleanupTestData(tableName: string): Promise<void>;
  protected assertQueryResult<T>(result: QueryResult<T>, expected: Partial<QueryResult<T>>): void;
}

// 数据库测试管理器
class TestDatabaseManager {
  private readonly config: TestDatabaseConfig;
  private readonly migrationRunner: MigrationRunner;
  
  async setupTestDatabase(): Promise<void> {
    await this.createTestSchema();
    await this.runMigrations();
    await this.seedTestData();
  }
  
  async cleanupTestDatabase(): Promise<void> {
    await this.dropTestSchema();
  }
  
  async createTestTransaction(): Promise<TestTransaction> {
    // 为每个测试创建独立的事务，测试结束时回滚
  }
}

// Mock MCP客户端
class MockMCPClient {
  private readonly tools: Map<string, MockTool>;
  private readonly requestHistory: MCPRequest[];
  
  registerMockTool(name: string, mockImplementation: MockTool): void;
  simulateToolCall(toolName: string, parameters: unknown): Promise<MCPResponse>;
  getRequestHistory(): ReadonlyArray<MCPRequest>;
  clearHistory(): void;
}

// 测试数据工厂
class TestDataFactory {
  static createTableStructure(overrides?: Partial<TableStructure>): TableStructure;
  static createColumnInfo(overrides?: Partial<ColumnInfo>): ColumnInfo;
  static createIndexInfo(overrides?: Partial<IndexInfo>): IndexInfo;
  static createDatabaseConfig(overrides?: Partial<DatabaseConfig>): DatabaseConfig;
  static createMCPRequest<T>(toolName: string, parameters: T): MCPRequest<T>;
  static createMCPResponse<T>(data: T): MCPResponse<T>;
}

// 断言助手
class TestAssertions {
  static assertTableStructure(actual: TableStructure, expected: Partial<TableStructure>): void;
  static assertQueryPerformance(executionTime: number, maxTime: number): void;
  static assertSecurityViolation(fn: () => Promise<void>): Promise<void>;
  static assertDataMasking(original: unknown, masked: unknown, rule: MaskingRule): void;
}
```

#### 2.7.3 集成测试架构
```typescript
// 集成测试套件
interface IntegrationTestSuite {
  readonly name: string;
  readonly description: string;
  readonly tests: IntegrationTest[];
  readonly setupHooks: TestHook[];
  readonly teardownHooks: TestHook[];
}

// 集成测试定义
interface IntegrationTest {
  readonly name: string;
  readonly description: string;
  readonly steps: TestStep[];
  readonly expectedResults: ExpectedResult[];
  readonly timeout: number;
}

// 测试步骤
interface TestStep {
  readonly action: TestAction;
  readonly parameters: Record<string, unknown>;
  readonly expectedDuration: number;
  readonly retryPolicy?: RetryPolicy;
}

// MCP集成测试管理器
class MCPIntegrationTestManager {
  private readonly mcpServer: MCPServer;
  private readonly testDatabase: TestDatabase;
  
  async testToolRegistration(): Promise<void> {
    // 测试所有工具是否正确注册
  }
  
  async testToolExecution(): Promise<void> {
    // 测试所有工具的执行流程
  }
  
  async testErrorHandling(): Promise<void> {
    // 测试错误处理机制
  }
  
  async testConcurrentRequests(): Promise<void> {
    // 测试并发请求处理
  }
}

// 数据库集成测试管理器
class DatabaseIntegrationTestManager {
  async testConnectionPooling(): Promise<void> {
    // 测试连接池管理
  }
  
  async testQueryExecution(): Promise<void> {
    // 测试查询执行流程
  }
  
  async testTransactionHandling(): Promise<void> {
    // 测试事务处理
  }
  
  async testFailoverMechanism(): Promise<void> {
    // 测试故障转移机制
  }
}

// 安全集成测试管理器
class SecurityIntegrationTestManager {
  async testSQLInjectionPrevention(): Promise<void> {
    // 测试SQL注入防护
  }
  
  async testDataMaskingPipeline(): Promise<void> {
    // 测试数据脱敏流程
  }
  
  async testAccessControlEnforcement(): Promise<void> {
    // 测试访问控制执行
  }
  
  async testAuditLogging(): Promise<void> {
    // 测试审计日志记录
  }
}
```

#### 2.7.4 端到端测试架构
```typescript
// E2E测试场景定义
interface E2ETestScenario {
  readonly name: string;
  readonly description: string;
  readonly userStory: string;
  readonly preconditions: Precondition[];
  readonly testFlow: TestFlow[];
  readonly expectedOutcome: ExpectedOutcome;
}

// E2E测试执行器
class E2ETestExecutor {
  private readonly claudeCodeEnvironment: MockClaudeCodeEnvironment;
  private readonly mcpService: MCPService;
  
  async executeScenario(scenario: E2ETestScenario): Promise<TestResult> {
    await this.setupPreconditions(scenario.preconditions);
    
    for (const flow of scenario.testFlow) {
      await this.executeTestFlow(flow);
    }
    
    return this.validateOutcome(scenario.expectedOutcome);
  }
  
  private async executeTestFlow(flow: TestFlow): Promise<void> {
    switch (flow.type) {
      case 'natural_language_query':
        await this.simulateNaturalLanguageQuery(flow.input);
        break;
      case 'direct_tool_call':
        await this.simulateDirectToolCall(flow.toolName, flow.parameters);
        break;
      case 'error_scenario':
        await this.simulateErrorScenario(flow.errorType);
        break;
    }
  }
}

// Mock ClaudeCode环境
class MockClaudeCodeEnvironment {
  private readonly mcpClient: MCPClient;
  private readonly conversationHistory: ConversationMessage[];
  
  async sendNaturalLanguageQuery(query: string): Promise<string> {
    // 模拟用户通过自然语言查询数据库
  }
  
  async expectToolCall(toolName: string, parameters: unknown): Promise<void> {
    // 验证是否调用了正确的工具
  }
  
  async expectResponse(expectedContent: string): Promise<void> {
    // 验证响应内容是否符合预期
  }
}
```

#### 2.7.5 性能测试架构
```typescript
// 性能测试配置
interface PerformanceTestConfig {
  readonly concurrentUsers: number;
  readonly testDuration: number;
  readonly rampUpTime: number;
  readonly thresholds: PerformanceThresholds;
}

interface PerformanceThresholds {
  readonly maxResponseTime: number;
  readonly maxErrorRate: number;
  readonly minThroughput: number;
  readonly maxMemoryUsage: number;
  readonly maxCpuUsage: number;
}

// 性能测试执行器
class PerformanceTestExecutor {
  private readonly loadGenerator: LoadGenerator;
  private readonly metricsCollector: MetricsCollector;
  
  async executeLoadTest(config: PerformanceTestConfig): Promise<PerformanceReport> {
    const testSession = await this.startTestSession(config);
    
    // 执行预热阶段
    await this.warmupPhase(config.rampUpTime);
    
    // 执行主测试阶段
    const metrics = await this.mainTestPhase(config.testDuration);
    
    // 执行冷却阶段
    await this.cooldownPhase();
    
    return this.generateReport(metrics, config.thresholds);
  }
  
  async executeStressTest(): Promise<StressTestReport> {
    // 压力测试，找到系统破坏点
  }
  
  async executeSpikeTest(): Promise<SpikeTestReport> {
    // 尖峰测试，验证系统在突发负载下的表现
  }
}

// 指标收集器
class MetricsCollector {
  private readonly systemMetrics: SystemMetricsCollector;
  private readonly applicationMetrics: ApplicationMetricsCollector;
  
  async collectMetrics(duration: number): Promise<PerformanceMetrics> {
    return {
      responseTime: await this.collectResponseTimeMetrics(),
      throughput: await this.collectThroughputMetrics(),
      errorRate: await this.collectErrorRateMetrics(),
      resourceUsage: await this.collectResourceUsageMetrics(),
      databaseMetrics: await this.collectDatabaseMetrics()
    };
  }
}
```

#### 2.7.6 测试数据管理
```typescript
// 测试数据管理器
class TestDataManager {
  private readonly datasetRegistry: Map<string, Dataset>;
  private readonly seedDataLoader: SeedDataLoader;
  
  async loadDataset(name: string): Promise<Dataset> {
    if (!this.datasetRegistry.has(name)) {
      const dataset = await this.seedDataLoader.loadDataset(name);
      this.datasetRegistry.set(name, dataset);
    }
    return this.datasetRegistry.get(name)!;
  }
  
  async createTestSpecificData(requirements: DataRequirements): Promise<TestData> {
    // 根据测试需求动态创建测试数据
  }
  
  async cleanupTestData(testId: string): Promise<void> {
    // 清理测试特定的数据
  }
}

// 数据集定义
interface Dataset {
  readonly name: string;
  readonly description: string;
  readonly tables: TableData[];
  readonly constraints: ConstraintData[];
  readonly indexes: IndexData[];
}

interface TableData {
  readonly tableName: string;
  readonly schema: TableSchema;
  readonly rows: Record<string, unknown>[];
}
```

### 2.8 Docker部署架构设计（新增）

#### 2.8.1 容器化架构
```dockerfile
# 多阶段构建 Dockerfile
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY src/ ./src/

# 构建应用
RUN npm run build

# 生产环境镜像
FROM node:18-alpine AS production

# 创建非root用户
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001

# 设置工作目录
WORKDIR /app

# 复制构建产物
COPY --from=builder --chown=mcpuser:mcpuser /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:mcpuser /app/dist ./dist
COPY --chown=mcpuser:mcpuser config/ ./config/

# 安装健康检查工具
RUN apk add --no-cache curl

# 创建健康检查脚本
COPY --chown=mcpuser:mcpuser scripts/health-check.sh ./
RUN chmod +x health-check.sh

# 切换到非root用户
USER mcpuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ./health-check.sh

# 启动应用
CMD ["node", "dist/index.js"]
```

#### 2.8.2 Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-mysql-service:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: mcp-mysql-service
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=${DB_NAME:-mcptest}
      - DB_USER=${DB_USER:-mcpuser}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - mcp-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  mysql:
    image: mysql:8.0
    container_name: mcp-mysql-db
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${DB_NAME:-mcptest}
      - MYSQL_USER=${DB_USER:-mcpuser}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql/init:/docker-entrypoint-initdb.d
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 10s
      retries: 5
      start_period: 30s
      interval: 30s

  redis:
    image: redis:7-alpine
    container_name: mcp-redis-cache
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 5s
      retries: 3
      start_period: 10s
      interval: 15s

  prometheus:
    image: prom/prometheus:latest
    container_name: mcp-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    ports:
      - "9090:9090"
    networks:
      - mcp-network

  grafana:
    image: grafana/grafana:latest
    container_name: mcp-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    networks:
      - mcp-network

volumes:
  mysql_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  mcp-network:
    driver: bridge
```

#### 2.8.3 CI/CD流程设计
```yaml
# .github/workflows/ci-cd.yml
name: MCP MySQL Service CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpass
          MYSQL_DATABASE: testdb
        options: >-
          --health-cmd="mysqladmin ping -h localhost"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
      env:
        DB_HOST: 127.0.0.1
        DB_PORT: 3306
        DB_NAME: testdb
        DB_USER: root
        DB_PASSWORD: testpass
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security audit
      run: npm audit --audit-level high
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build-and-push:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # 实际部署脚本
    
    - name: Run smoke tests
      run: |
        echo "Running smoke tests..."
        # 冒烟测试脚本
    
    - name: Deploy to production
      if: success()
      run: |
        echo "Deploying to production environment..."
        # 生产环境部署脚本
```

### 2.9 高级功能设计（新增）

#### 2.9.1 SQL执行计划分析
```typescript
// SQL执行计划分析器
class SQLExecutionPlanAnalyzer {
  constructor(private executor: QueryExecutor) {}
  
  // 获取查询执行计划
  async getExecutionPlan(query: string): Promise<ExecutionPlan> {
    // 验证查询安全性
    SecurityValidator.validateQuery(query);
    
    // 获取执行计划
    const explainQuery = `EXPLAIN FORMAT=JSON ${query}`;
    const result = await this.executor.executeSecureQuery(explainQuery);
    
    const planData = JSON.parse(result.rows[0]['EXPLAIN']);
    return this.parseExecutionPlan(planData, query);
  }
  
  // 分析查询性能
  async analyzeQueryPerformance(query: string): Promise<PerformanceAnalysis> {
    const [executionPlan, queryStats] = await Promise.all([
      this.getExecutionPlan(query),
      this.getQueryStatistics(query)
    ]);
    
    return {
      executionPlan,
      queryStats,
      optimizationSuggestions: this.generateOptimizationSuggestions(executionPlan),
      performanceScore: this.calculatePerformanceScore(executionPlan, queryStats)
    };
  }
  
  // 生成优化建议
  private generateOptimizationSuggestions(plan: ExecutionPlan): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // 检查是否有全表扫描
    if (plan.planSteps.some(step => step.operation === OperationType.TABLE_SCAN)) {
      suggestions.push({
        type: 'INDEX_SUGGESTION',
        priority: 'HIGH',
        description: '检测到全表扫描，建议在WHERE条件涉及的列上创建索引',
        suggestedAction: '分析查询条件并创建合适的索引'
      });
    }
    
    // 检查连接操作效率
    const joinSteps = plan.planSteps.filter(step => 
      [OperationType.NESTED_LOOP, OperationType.HASH_JOIN].includes(step.operation)
    );
    
    if (joinSteps.length > 0) {
      const inefficientJoins = joinSteps.filter(step => step.cost > 1000);
      if (inefficientJoins.length > 0) {
        suggestions.push({
          type: 'JOIN_OPTIMIZATION',
          priority: 'MEDIUM',
          description: '检测到低效的连接操作，建议优化连接条件或创建索引',
          suggestedAction: '在连接条件涉及的列上创建索引，或调整查询逻辑'
        });
      }
    }
    
    return suggestions;
  }
  
  // 解析执行计划
  private parseExecutionPlan(planData: any, originalQuery: string): ExecutionPlan {
    const queryBlock = planData.query_block;
    const steps: PlanStep[] = [];
    let totalCost = 0;
    let estimatedRows = 0;
    
    this.extractPlanSteps(queryBlock, steps);
    
    steps.forEach(step => {
      totalCost += step.cost;
      estimatedRows += step.rows;
    });
    
    return {
      query: originalQuery,
      planSteps: steps,
      totalCost,
      estimatedRows,
      optimizationSuggestions: []
    };
  }
  
  // 提取计划步骤
  private extractPlanSteps(queryBlock: any, steps: PlanStep[], stepNumber = 1): number {
    if (queryBlock.table) {
      const table = queryBlock.table;
      steps.push({
        step: stepNumber++,
        operation: this.mapAccessType(table.access_type),
        table: table.table_name,
        index: table.key,
        cost: parseFloat(table.filtered || '100'),
        rows: parseInt(table.rows_examined_per_scan || '0'),
        details: {
          accessType: table.access_type,
          keyLength: table.key_length,
          ref: table.ref,
          extra: table.extra
        }
      });
    }
    
    // 递归处理嵌套查询
    if (queryBlock.nested_loop) {
      for (const nestedTable of queryBlock.nested_loop) {
        stepNumber = this.extractPlanSteps(nestedTable, steps, stepNumber);
      }
    }
    
    return stepNumber;
  }
  
  // 映射访问类型到操作类型
  private mapAccessType(accessType: string): OperationType {
    const mapping: Record<string, OperationType> = {
      'ALL': OperationType.TABLE_SCAN,
      'index': OperationType.INDEX_SCAN,
      'range': OperationType.INDEX_SEEK,
      'ref': OperationType.INDEX_SEEK,
      'eq_ref': OperationType.INDEX_SEEK,
      'const': OperationType.INDEX_SEEK,
      'system': OperationType.INDEX_SEEK
    };
    
    return mapping[accessType] || OperationType.TABLE_SCAN;
  }
}

// 性能分析结果接口
interface PerformanceAnalysis {
  readonly executionPlan: ExecutionPlan;
  readonly queryStats: QueryStatistics;
  readonly optimizationSuggestions: OptimizationSuggestion[];
  readonly performanceScore: number; // 0-100分
}

interface OptimizationSuggestion {
  readonly type: 'INDEX_SUGGESTION' | 'JOIN_OPTIMIZATION' | 'QUERY_REWRITE' | 'SCHEMA_OPTIMIZATION';
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly suggestedAction: string;
  readonly estimatedImprovement?: string;
}

interface QueryStatistics {
  readonly executionTime: number;
  readonly rowsExamined: number;
  readonly rowsReturned: number;
  readonly indexesUsed: string[];
  readonly temporaryTablesCreated: number;
  readonly sortOperations: number;
}
```

#### 2.9.2 性能监控和分析
```typescript
// 性能监控管理器
class PerformanceMonitor {
  private readonly metricsStorage: MetricsStorage;
  private readonly alertManager: AlertManager;
  private readonly queryProfiler: QueryProfiler;
  
  constructor(
    metricsStorage: MetricsStorage,
    alertManager: AlertManager
  ) {
    this.metricsStorage = metricsStorage;
    this.alertManager = alertManager;
    this.queryProfiler = new QueryProfiler();
  }
  
  // 实时性能监控
  async monitorQuery(query: string, execution: () => Promise<QueryResult>): Promise<QueryResult> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      // 开始查询分析
      const profileId = this.queryProfiler.startProfiling(query);
      
      // 执行查询
      const result = await execution();
      
      // 结束分析
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const profile = this.queryProfiler.endProfiling(profileId);
      
      // 计算性能指标
      const performanceMetrics: QueryPerformanceMetrics = {
        query,
        executionTime: Number(endTime - startTime) / 1_000_000, // 转换为毫秒
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        },
        rowsExamined: profile.rowsExamined,
        rowsReturned: result.rowCount,
        indexesUsed: profile.indexesUsed,
        cacheHits: profile.cacheHits,
        timestamp: new Date().toISOString()
      };
      
      // 存储指标
      await this.metricsStorage.storeMetrics(performanceMetrics);
      
      // 检查性能阈值
      await this.checkPerformanceThresholds(performanceMetrics);
      
      return result;
      
    } catch (error) {
      // 记录错误指标
      await this.recordQueryError(query, error);
      throw error;
    }
  }
  
  // 检查性能阈值
  private async checkPerformanceThresholds(metrics: QueryPerformanceMetrics): Promise<void> {
    const thresholds = await this.getPerformanceThresholds();
    
    // 执行时间阈值检查
    if (metrics.executionTime > thresholds.maxExecutionTime) {
      await this.alertManager.sendAlert({
        type: 'SLOW_QUERY',
        severity: 'WARNING',
        message: `查询执行时间过长: ${metrics.executionTime}ms (阈值: ${thresholds.maxExecutionTime}ms)`,
        query: metrics.query,
        metrics
      });
    }
    
    // 内存使用阈值检查
    if (metrics.memoryDelta.heapUsed > thresholds.maxMemoryDelta) {
      await this.alertManager.sendAlert({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'WARNING',
        message: `查询内存使用过高: ${metrics.memoryDelta.heapUsed} bytes`,
        query: metrics.query,
        metrics
      });
    }
    
    // 行扫描比例检查
    const scanRatio = metrics.rowsExamined / Math.max(metrics.rowsReturned, 1);
    if (scanRatio > thresholds.maxScanRatio) {
      await this.alertManager.sendAlert({
        type: 'INEFFICIENT_QUERY',
        severity: 'INFO',
        message: `查询效率较低，扫描行数与返回行数比例过高: ${scanRatio.toFixed(2)}`,
        query: metrics.query,
        metrics
      });
    }
  }
  
  // 生成性能报告
  async generatePerformanceReport(timeRange: TimeRange): Promise<PerformanceReport> {
    const metrics = await this.metricsStorage.getMetrics(timeRange);
    
    return {
      timeRange,
      totalQueries: metrics.length,
      averageExecutionTime: this.calculateAverage(metrics.map(m => m.executionTime)),
      slowestQueries: this.getTopSlowQueries(metrics, 10),
      mostFrequentQueries: this.getMostFrequentQueries(metrics, 10),
      indexUsageStats: this.analyzeIndexUsage(metrics),
      recommendedOptimizations: await this.generateOptimizationRecommendations(metrics)
    };
  }
}

// 查询性能指标接口
interface QueryPerformanceMetrics {
  readonly query: string;
  readonly executionTime: number;
  readonly memoryDelta: MemoryDelta;
  readonly rowsExamined: number;
  readonly rowsReturned: number;
  readonly indexesUsed: string[];
  readonly cacheHits: number;
  readonly timestamp: string;
}

interface MemoryDelta {
  readonly rss: number;
  readonly heapUsed: number;
  readonly heapTotal: number;
}

interface PerformanceThresholds {
  readonly maxExecutionTime: number; // 毫秒
  readonly maxMemoryDelta: number; // 字节
  readonly maxScanRatio: number; // 扫描行数/返回行数比例
}

interface PerformanceReport {
  readonly timeRange: TimeRange;
  readonly totalQueries: number;
  readonly averageExecutionTime: number;
  readonly slowestQueries: QueryMetricsSummary[];
  readonly mostFrequentQueries: QueryFrequency[];
  readonly indexUsageStats: IndexUsageStats;
  readonly recommendedOptimizations: OptimizationRecommendation[];
}
```

#### 2.9.3 智能缓存系统
```typescript
// 智能查询缓存管理器
class IntelligentCacheManager {
  private readonly cache: Map<string, CacheEntry>;
  private readonly cacheStats: CacheStatistics;
  private readonly maxCacheSize: number;
  private readonly defaultTTL: number;
  
  constructor(options: CacheOptions) {
    this.cache = new Map();
    this.cacheStats = new CacheStatistics();
    this.maxCacheSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5分钟
  }
  
  // 智能缓存键生成
  private generateCacheKey(query: string, parameters: any[]): string {
    // 标准化查询（移除多余空格、转小写等）
    const normalizedQuery = this.normalizeQuery(query);
    
    // 包含参数的哈希
    const paramHash = this.hashParameters(parameters);
    
    return `${this.hashString(normalizedQuery)}_${paramHash}`;
  }
  
  // 获取缓存结果
  async get<T>(query: string, parameters: any[] = []): Promise<T | null> {
    const cacheKey = this.generateCacheKey(query, parameters);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.cacheStats.recordMiss();
      return null;
    }
    
    // 检查TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.cacheStats.recordExpiry();
      return null;
    }
    
    // 更新访问统计
    entry.hitCount++;
    entry.lastAccessed = Date.now();
    
    this.cacheStats.recordHit();
    return entry.data as T;
  }
  
  // 设置缓存
  async set<T>(
    query: string, 
    parameters: any[], 
    data: T, 
    customTTL?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(query, parameters);
    const ttl = customTTL || this.calculateDynamicTTL(query, data);
    const expiresAt = Date.now() + ttl;
    
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLeastUsed();
    }
    
    const entry: CacheEntry = {
      data,
      createdAt: Date.now(),
      expiresAt,
      lastAccessed: Date.now(),
      hitCount: 0,
      size: this.calculateDataSize(data)
    };
    
    this.cache.set(cacheKey, entry);
    this.cacheStats.recordStore();
  }
  
  // 动态TTL计算
  private calculateDynamicTTL(query: string, data: any): number {
    const baseScore = this.defaultTTL;
    
    // 根据查询复杂度调整TTL
    const complexityScore = this.calculateQueryComplexity(query);
    const complexityMultiplier = Math.min(2.0, 1.0 + complexityScore / 10);
    
    // 根据数据大小调整TTL
    const dataSize = this.calculateDataSize(data);
    const sizeMultiplier = dataSize > 10000 ? 1.5 : 1.0; // 大数据集缓存更久
    
    // 根据当前时间调整TTL（业务高峰期缓存更久）
    const timeMultiplier = this.getTimeBasedMultiplier();
    
    return Math.floor(baseScore * complexityMultiplier * sizeMultiplier * timeMultiplier);
  }
  
  // 计算查询复杂度
  private calculateQueryComplexity(query: string): number {
    const normalizedQuery = query.toLowerCase();
    let complexity = 0;
    
    // JOIN操作增加复杂度
    const joinCount = (normalizedQuery.match(/\bjoin\b/g) || []).length;
    complexity += joinCount * 2;
    
    // 子查询增加复杂度
    const subqueryCount = (normalizedQuery.match(/\bselect\b/g) || []).length - 1;
    complexity += subqueryCount * 3;
    
    // 聚合函数增加复杂度
    const aggregateCount = (normalizedQuery.match(/\b(count|sum|avg|max|min|group by)\b/g) || []).length;
    complexity += aggregateCount * 1;
    
    // 排序操作增加复杂度
    const sortCount = (normalizedQuery.match(/\border by\b/g) || []).length;
    complexity += sortCount * 1;
    
    return Math.min(complexity, 20); // 最大复杂度为20
  }
  
  // LRU缓存淘汰
  private async evictLeastUsed(): Promise<void> {
    let leastUsedKey: string | null = null;
    let leastUsedScore = Infinity;
    
    for (const [key, entry] of this.cache) {
      // 计算使用得分（结合访问次数和最后访问时间）
      const timeSinceLastAccess = Date.now() - entry.lastAccessed;
      const score = entry.hitCount / (1 + timeSinceLastAccess / 1000); // 时间权重
      
      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.cacheStats.recordEviction();
    }
  }
  
  // 缓存预热
  async warmupCache(commonQueries: WarmupQuery[]): Promise<void> {
    for (const warmupQuery of commonQueries) {
      try {
        // 执行查询并缓存结果
        const result = await this.executeQuery(warmupQuery.query, warmupQuery.parameters);
        await this.set(warmupQuery.query, warmupQuery.parameters, result, warmupQuery.ttl);
      } catch (error) {
        // 预热失败不影响系统启动
        console.warn(`缓存预热失败: ${warmupQuery.query}`, error);
      }
    }
  }
  
  // 获取缓存统计信息
  getCacheStatistics(): CacheStatistics {
    return {
      ...this.cacheStats,
      currentSize: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.calculateTotalMemoryUsage()
    };
  }
}

// 缓存相关接口
interface CacheEntry {
  readonly data: any;
  readonly createdAt: number;
  readonly expiresAt: number;
  lastAccessed: number;
  hitCount: number;
  readonly size: number;
}

interface CacheOptions {
  readonly maxSize?: number;
  readonly defaultTTL?: number;
  readonly enableStatistics?: boolean;
}

interface WarmupQuery {
  readonly query: string;
  readonly parameters: any[];
  readonly ttl?: number;
}

class CacheStatistics {
  private hits = 0;
  private misses = 0;
  private stores = 0;
  private evictions = 0;
  private expiries = 0;
  
  recordHit(): void { this.hits++; }
  recordMiss(): void { this.misses++; }
  recordStore(): void { this.stores++; }
  recordEviction(): void { this.evictions++; }
  recordExpiry(): void { this.expiries++; }
  
  getHitRatio(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  
  getStatistics() {
    return {
      hits: this.hits,
      misses: this.misses,
      stores: this.stores,
      evictions: this.evictions,
      expiries: this.expiries,
      hitRatio: this.getHitRatio()
    };
  }
}
```

### 2.10 配置管理设计
```typescript
// 配置接口定义
interface MCPMySQLConfig {
  // 数据库配置
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: {
      enabled: boolean;
      rejectUnauthorized?: boolean;
      ca?: string;
      cert?: string;
      key?: string;
    };
    pool: {
      connectionLimit: number;
      queueLimit: number;
      acquireTimeout: number;
      timeout: number;
    };
  };
  
  // 安全配置
  security: {
    allowedTables?: string[];
    deniedTables?: string[];
    maxQueryTime: number;
    maxResultRows: number;
    enableDataMasking: boolean;
    sensitiveColumns: string[];
  };
  
  // 日志配置
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableQueryLog: boolean;
    logQueries: boolean;
    logResults: boolean;
  };
  
  // MCP服务配置
  mcp: {
    serverName: string;
    version: string;
    description: string;
  };
}
```

##### 2.10.2 配置验证
```typescript
// 配置验证器
class ConfigValidator {
  private static readonly schema = z.object({
    database: z.object({
      host: z.string().min(1),
      port: z.number().min(1).max(65535),
      database: z.string().min(1),
      username: z.string().min(1),
      password: z.string(),
      ssl: z.object({
        enabled: z.boolean(),
        rejectUnauthorized: z.boolean().optional(),
        ca: z.string().optional(),
        cert: z.string().optional(),
        key: z.string().optional()
      }).optional(),
      pool: z.object({
        connectionLimit: z.number().min(1).max(100),
        queueLimit: z.number().min(0),
        acquireTimeout: z.number().min(1000),
        timeout: z.number().min(1000)
      })
    }),
    security: z.object({
      allowedTables: z.array(z.string()).optional(),
      deniedTables: z.array(z.string()).optional(),
      maxQueryTime: z.number().min(1000),
      maxResultRows: z.number().min(1).max(10000),
      enableDataMasking: z.boolean(),
      sensitiveColumns: z.array(z.string())
    }),
    logging: z.object({
      level: z.enum(['error', 'warn', 'info', 'debug']),
      enableQueryLog: z.boolean(),
      logQueries: z.boolean(),
      logResults: z.boolean()
    }),
    mcp: z.object({
      serverName: z.string().min(1),
      version: z.string().min(1),
      description: z.string()
    })
  });
  
  static validate(config: any): MCPMySQLConfig {
    try {
      return this.schema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ValidationError('CONFIG_VALIDATION_FAILED', `配置验证失败: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }
}
```

## 3. 部署和运维设计

### 3.1 项目结构设计
```
mcp-mysql-service/
├── src/                          # 源代码目录
│   ├── server/                   # MCP服务器实现
│   │   ├── MCPServer.ts          # 主服务器类
│   │   └── ToolRegistry.ts       # 工具注册管理
│   ├── database/                 # 数据库相关
│   │   ├── ConnectionManager.ts  # 连接管理
│   │   ├── QueryExecutor.ts      # 查询执行器
│   │   └── QueryEngine.ts        # 查询引擎
│   ├── security/                 # 安全模块
│   │   ├── SecurityValidator.ts  # 安全验证
│   │   ├── AccessController.ts   # 访问控制
│   │   └── DataMasking.ts        # 数据脱敏
│   ├── tools/                    # MCP工具实现
│   │   ├── MySQLTools.ts         # MySQL工具集
│   │   └── ToolDefinitions.ts    # 工具定义
│   ├── types/                    # 类型定义
│   │   ├── index.ts              # 导出所有类型
│   │   ├── database.ts           # 数据库类型
│   │   ├── mcp.ts                # MCP协议类型
│   │   └── config.ts             # 配置类型
│   ├── utils/                    # 工具函数
│   │   ├── logger.ts             # 日志工具
│   │   ├── errors.ts             # 错误定义
│   │   └── validation.ts         # 验证工具
│   └── index.ts                  # 主入口文件
├── config/                       # 配置文件
│   ├── default.json              # 默认配置
│   ├── development.json          # 开发环境配置
│   ├── production.json           # 生产环境配置
│   └── .env.example              # 环境变量示例
├── tests/                        # 测试目录
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   └── fixtures/                 # 测试数据
├── docs/                         # 文档目录
│   ├── api.md                    # API文档
│   ├── configuration.md          # 配置说明
│   └── deployment.md             # 部署指南
├── scripts/                      # 脚本目录
│   ├── build.sh                  # 构建脚本
│   ├── test.sh                   # 测试脚本
│   └── deploy.sh                 # 部署脚本
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript配置
├── jest.config.js                # 测试配置
├── .gitignore                    # Git忽略文件
├── .env                          # 环境变量（需要创建）
└── README.md                     # 项目说明
```

### 3.2 构建和部署流程
```bash
# 开发环境启动脚本
#!/bin/bash
echo "启动MCP MySQL服务开发环境..."

# 检查Node.js版本
node_version=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ $node_version -lt 18 ]; then
    echo "错误: 需要Node.js 18或更高版本"
    exit 1
fi

# 安装依赖
echo "安装项目依赖..."
npm install

# 检查配置文件
if [ ! -f ".env" ]; then
    echo "创建环境配置文件..."
    cp config/.env.example .env
    echo "请编辑 .env 文件，配置数据库连接信息"
fi

# 检查数据库连接
echo "检查数据库连接..."
npm run test:connection

# 构建项目
echo "构建项目..."
npm run build

# 启动服务
echo "启动MCP服务..."
npm run dev
```

### 3.3 监控和日志设计
```typescript
// 监控指标定义
interface ServiceMetrics {
  // 连接指标
  activeConnections: number;
  totalConnections: number;
  failedConnections: number;
  
  // 查询指标
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgQueryTime: number;
  
  // 安全指标
  blockedQueries: number;
  securityViolations: number;
  
  // 系统指标
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

// 监控管理器
class MetricsManager {
  private metrics: ServiceMetrics;
  private startTime: number;
  
  constructor() {
    this.metrics = this.initializeMetrics();
    this.startTime = Date.now();
  }
  
  // 记录查询指标
  recordQuery(success: boolean, executionTime: number): void {
    this.metrics.totalQueries++;
    if (success) {
      this.metrics.successfulQueries++;
    } else {
      this.metrics.failedQueries++;
    }
    
    // 更新平均查询时间
    this.updateAverageQueryTime(executionTime);
  }
  
  // 获取当前指标
  getCurrentMetrics(): ServiceMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user
    };
  }
}
```

---

*本设计方案提供了完整的技术架构和实现细节，确保MCP MySQL服务的安全性、稳定性和可维护性。所有技术选择都经过仔细考虑，符合现代软件开发的最佳实践。*