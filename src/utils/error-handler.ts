/**
 * 简化的错误处理器
 */

export class ErrorHandler {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  handleError(error: Error): void {
    this.logger.error('处理错误', { error: error.message, stack: error.stack });
  }
}