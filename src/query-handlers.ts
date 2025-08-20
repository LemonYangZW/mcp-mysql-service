/**
 * 查询处理器 - 简化版本
 * 处理MCP工具的具体查询逻辑
 */

import { MySQLClient } from './mysql-client.js';
import { MCPMySQL } from './types/mcp.js';

export class QueryHandlers {
  private mysqlClient: MySQLClient;
  private logger: any;

  constructor(mysqlClient: MySQLClient, logger: any) {
    this.mysqlClient = mysqlClient;
    this.logger = logger;
  }

  /**
   * 处理连接测试
   */
  async handleConnect(): Promise<MCPMySQL.MCPResponse<{ connected: boolean; database: string; timestamp: string }>> {
    try {
      const connected = await this.mysqlClient.testConnection();
      
      return {
        success: true,
        data: {
          connected,
          database: this.mysqlClient['config'].database,
          timestamp: new Date().toISOString()
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      };
    } catch (error) {
      this.logger.error('连接测试失败', { error });
      
      return {
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: `连接测试失败: ${error.message}`,
          type: MCPMySQL.ErrorType.CONNECTION_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      };
    }
  }

  /**
   * 处理表列表查询
   */
  async handleListTables(): Promise<MCPMySQL.MCPResponse<{ tables: string[]; count: number }>> {
    const startTime = Date.now();
    
    try {
      const tables = await this.mysqlClient.listTables();
      const executionTime = Date.now() - startTime;
      
      this.logger.info('表列表查询成功', { count: tables.length, executionTime });
      
      return {
        success: true,
        data: {
          tables,
          count: tables.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('表列表查询失败', { error, executionTime });
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: `获取表列表失败: ${error.message}`,
          type: MCPMySQL.ErrorType.DATABASE_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    }
  }

  /**
   * 处理表结构查询
   */
  async handleDescribeTable(tableName: string): Promise<MCPMySQL.MCPResponse<MCPMySQL.TableStructure>> {
    const startTime = Date.now();
    
    try {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('表名不能为空');
      }

      const structure = await this.mysqlClient.getTableStructure(tableName);
      const executionTime = Date.now() - startTime;
      
      this.logger.info('表结构查询成功', { tableName, columnCount: structure.columns.length, executionTime });
      
      return {
        success: true,
        data: structure,
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('表结构查询失败', { tableName, error, executionTime });
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: `获取表结构失败: ${error.message}`,
          type: MCPMySQL.ErrorType.DATABASE_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    }
  }

  /**
   * 处理表统计信息查询
   */
  async handleTableStats(tableName: string): Promise<MCPMySQL.MCPResponse<MCPMySQL.TableStats>> {
    const startTime = Date.now();
    
    try {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('表名不能为空');
      }

      const stats = await this.mysqlClient.getTableStats(tableName);
      const executionTime = Date.now() - startTime;
      
      this.logger.info('表统计信息查询成功', { tableName, totalRows: stats.totalRows, executionTime });
      
      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('表统计信息查询失败', { tableName, error, executionTime });
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: `获取表统计信息失败: ${error.message}`,
          type: MCPMySQL.ErrorType.DATABASE_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    }
  }

  /**
   * 处理列分析
   */
  async handleAnalyzeColumn(
    tableName: string, 
    columnName: string, 
    analysisType: MCPMySQL.AnalysisType = MCPMySQL.AnalysisType.DISTRIBUTION
  ): Promise<MCPMySQL.MCPResponse<MCPMySQL.ColumnAnalysis>> {
    const startTime = Date.now();
    
    try {
      if (!tableName || typeof tableName !== 'string') {
        throw new Error('表名不能为空');
      }
      
      if (!columnName || typeof columnName !== 'string') {
        throw new Error('列名不能为空');
      }

      const analysis = await this.mysqlClient.analyzeColumn(tableName, columnName, analysisType);
      const executionTime = Date.now() - startTime;
      
      this.logger.info('列分析成功', { tableName, columnName, analysisType, executionTime });
      
      return {
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('列分析失败', { tableName, columnName, analysisType, error, executionTime });
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: `列分析失败: ${error.message}`,
          type: MCPMySQL.ErrorType.DATABASE_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    }
  }

  /**
   * 处理安全查询执行
   */
  async handleSafeQuery(query: string, params: any[] = []): Promise<MCPMySQL.MCPResponse<any>> {
    const startTime = Date.now();
    
    try {
      // 基础安全检查
      if (!query || typeof query !== 'string') {
        throw new Error('查询语句不能为空');
      }

      const normalizedQuery = query.trim().toLowerCase();
      
      // 只允许SELECT查询
      if (!normalizedQuery.startsWith('select')) {
        throw new Error('只允许执行SELECT查询');
      }

      // 检查危险关键词
      const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'create', 'alter', 'truncate'];
      if (dangerousKeywords.some(keyword => normalizedQuery.includes(keyword))) {
        throw new Error('查询包含不允许的关键词');
      }

      // 限制结果数量
      let finalQuery = query;
      if (!normalizedQuery.includes('limit')) {
        finalQuery += ' LIMIT 1000';
      }

      const result = await this.mysqlClient.query(finalQuery, params);
      const executionTime = Date.now() - startTime;
      
      this.logger.info('安全查询执行成功', { 
        query: query.substring(0, 100),
        rowCount: result.rowCount, 
        executionTime 
      });
      
      return {
        success: true,
        data: {
          rows: result.rows,
          fields: result.fields,
          rowCount: result.rowCount
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime,
          queryInfo: {
            sql: finalQuery,
            affectedRows: result.rowCount
          }
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error('安全查询执行失败', { 
        query: query.substring(0, 100), 
        error, 
        executionTime 
      });
      
      return {
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: `查询执行失败: ${error.message}`,
          type: MCPMySQL.ErrorType.SECURITY_ERROR
        },
        metadata: {
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    }
  }
}