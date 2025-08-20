/**
 * MCP服务器 - 简化版本
 * 负责注册和处理MCP工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QueryHandlers } from './query-handlers.js';
import { MCPMySQL } from './types/mcp.js';

export class MCPServer {
  private server: Server;
  private queryHandlers: QueryHandlers;
  private errorHandler: any;

  constructor(server: Server, queryHandlers: QueryHandlers, errorHandler: any) {
    this.server = server;
    this.queryHandlers = queryHandlers;
    this.errorHandler = errorHandler;
  }

  /**
   * 注册所有MCP工具
   */
  registerTools(): void {
    // 注册工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'mysql_connect',
          description: '测试MySQL数据库连接状态',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'mysql_list_tables',
          description: '获取数据库中所有表的列表',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: 'mysql_describe_table',
          description: '获取指定表的详细结构信息，包括列定义、索引等',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '要查询的表名',
              },
            },
            required: ['tableName'],
            additionalProperties: false,
          },
        },
        {
          name: 'mysql_table_stats',
          description: '获取表的统计信息，如行数、大小等',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '要统计的表名',
              },
            },
            required: ['tableName'],
            additionalProperties: false,
          },
        },
        {
          name: 'mysql_analyze_column',
          description: '分析指定列的数据分布、空值情况等',
          inputSchema: {
            type: 'object',
            properties: {
              tableName: {
                type: 'string',
                description: '表名',
              },
              columnName: {
                type: 'string',
                description: '列名',
              },
              analysisType: {
                type: 'string',
                description: '分析类型',
                enum: ['distribution', 'nulls', 'unique', 'range'],
                default: 'distribution',
              },
            },
            required: ['tableName', 'columnName'],
            additionalProperties: false,
          },
        },
        {
          name: 'mysql_execute_safe_query',
          description: '执行安全的SELECT查询（只读操作）',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL查询语句（仅支持SELECT）',
              },
              params: {
                type: 'array',
                description: '查询参数',
                items: {
                  type: 'string',
                },
                default: [],
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
      ],
    }));

    // 注册工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mysql_connect':
            return await this.handleConnect();

          case 'mysql_list_tables':
            return await this.handleListTables();

          case 'mysql_describe_table':
            return await this.handleDescribeTable(args);

          case 'mysql_table_stats':
            return await this.handleTableStats(args);

          case 'mysql_analyze_column':
            return await this.handleAnalyzeColumn(args);

          case 'mysql_execute_safe_query':
            return await this.handleSafeQuery(args);

          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: 'TOOL_EXECUTION_ERROR',
                  message: `工具执行失败: ${error.message}`,
                  type: MCPMySQL.ErrorType.SYSTEM_ERROR,
                },
                metadata: {
                  timestamp: new Date().toISOString(),
                  executionTime: 0,
                },
              }, null, 2),
            },
          ],
        };
      }
    });
  }

  /**
   * 处理连接测试工具
   */
  private async handleConnect() {
    const result = await this.queryHandlers.handleConnect();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理表列表查询工具
   */
  private async handleListTables() {
    const result = await this.queryHandlers.handleListTables();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理表结构查询工具
   */
  private async handleDescribeTable(args: any) {
    if (!args?.tableName) {
      throw new Error('缺少必需参数: tableName');
    }

    const result = await this.queryHandlers.handleDescribeTable(args.tableName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理表统计信息工具
   */
  private async handleTableStats(args: any) {
    if (!args?.tableName) {
      throw new Error('缺少必需参数: tableName');
    }

    const result = await this.queryHandlers.handleTableStats(args.tableName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理列分析工具
   */
  private async handleAnalyzeColumn(args: any) {
    if (!args?.tableName || !args?.columnName) {
      throw new Error('缺少必需参数: tableName 和 columnName');
    }

    const analysisType = args.analysisType || MCPMySQL.AnalysisType.DISTRIBUTION;
    const result = await this.queryHandlers.handleAnalyzeColumn(
      args.tableName,
      args.columnName,
      analysisType
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理安全查询工具
   */
  private async handleSafeQuery(args: any) {
    if (!args?.query) {
      throw new Error('缺少必需参数: query');
    }

    const params = args.params || [];
    const result = await this.queryHandlers.handleSafeQuery(args.query, params);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
}