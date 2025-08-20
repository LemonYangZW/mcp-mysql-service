#!/usr/bin/env node
/**
 * MCP MySQL 服务主入口文件 - 简化版本
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';

import { MySQLClient } from './mysql-client.js';
import { MCPServer } from './mcp-server.js';
import { QueryHandlers } from './query-handlers.js';
import { Logger } from './utils/logger.js';
import { ConfigManager } from './utils/config.js';
import { ErrorHandler } from './utils/error-handler.js';

// 加载环境配置
config();

/**
 * 主应用类
 */
class MCPMySQLService {
  private server: Server;
  private mysqlClient: MySQLClient;
  private mcpServer: MCPServer;
  private queryHandlers: QueryHandlers;
  private logger: Logger;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = Logger.getInstance();
    this.configManager = ConfigManager.getInstance();
    this.errorHandler = new ErrorHandler(this.logger);
    
    this.server = new Server(
      {
        name: 'mcp-mysql-service',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.logger.info('MCP MySQL服务初始化完成');
  }

  /**
   * 初始化数据库连接
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const dbConfig = this.configManager.getDatabaseConfig();
      this.mysqlClient = new MySQLClient(dbConfig);
      await this.mysqlClient.connect();
      
      this.logger.info('数据库连接初始化成功', {
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port
      });
    } catch (error) {
      this.logger.error('数据库连接初始化失败', { error });
      throw error;
    }
  }

  /**
   * 初始化查询处理器
   */
  private initializeQueryHandlers(): void {
    this.queryHandlers = new QueryHandlers(this.mysqlClient, this.logger);
    this.logger.info('查询处理器初始化完成');
  }

  /**
   * 初始化MCP服务器
   */
  private initializeMCPServer(): void {
    this.mcpServer = new MCPServer(this.server, this.queryHandlers, this.errorHandler);
    this.mcpServer.registerTools();
    this.logger.info('MCP服务器初始化完成');
  }

  /**
   * 设置信号处理器
   */
  private setupSignalHandlers(): void {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      this.logger.info(`收到${signal}信号，开始优雅关闭服务`);
      
      try {
        if (this.mysqlClient) {
          await this.mysqlClient.disconnect();
          this.logger.info('数据库连接已关闭');
        }
        
        this.logger.info('服务优雅关闭完成');
        process.exit(0);
      } catch (error) {
        this.logger.error('优雅关闭过程中发生错误', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      this.logger.error('未捕获的异常', { error });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason) => {
      this.logger.error('未处理的Promise拒绝', { reason });
      process.exit(1);
    });
  }

  /**
   * 启动服务
   */
  public async start(): Promise<void> {
    try {
      this.logger.info('开始启动MCP MySQL服务...');
      
      await this.initializeDatabase();
      this.initializeQueryHandlers();
      this.initializeMCPServer();
      this.setupSignalHandlers();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.info('MCP MySQL服务启动成功');
      
      console.error('🚀 MCP MySQL服务已启动');
      console.error('📊 支持的工具:');
      console.error('  • mysql_connect - 连接数据库');
      console.error('  • mysql_list_tables - 获取表列表');
      console.error('  • mysql_describe_table - 查询表结构');
      console.error('  • mysql_table_stats - 获取表统计信息');
      console.error('  • mysql_analyze_column - 分析字段数据');
      console.error('  • mysql_execute_safe_query - 执行安全查询');
      console.error('🔒 安全特性: 只读权限、SQL注入防护');
      
    } catch (error) {
      this.logger.error('服务启动失败', { error });
      console.error('❌ MCP MySQL服务启动失败:', error.message);
      process.exit(1);
    }
  }
}

/**
 * 程序入口点
 */
async function main(): Promise<void> {
  try {
    const service = new MCPMySQLService();
    await service.start();
  } catch (error) {
    console.error('启动MCP MySQL服务时发生致命错误:', error);
    process.exit(1);
  }
}

// 启动服务
main().catch((error) => {
  console.error('程序执行失败:', error);
  process.exit(1);
});

export { MCPMySQLService };