import type { Logger } from '@nestjs/common';

export interface LogMethodOptions {
  logStart?: boolean;
  logEnd?: boolean;
  logError?: boolean;
  level?: 'debug' | 'log' | 'verbose';
}

const defaultOptions: LogMethodOptions = {
  level: 'log',
  logEnd: true,
  logError: true,
  logStart: true,
};

/**
 * Method decorator for automatic logging of method execution.
 */
export function LogMethod(options: LogMethodOptions = {}) {
  return (
    _target: object,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const opts = { ...defaultOptions, ...options };

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (options.logStart === undefined) opts.logStart = false;
      if (options.logEnd === undefined) opts.logEnd = false;
      if (options.logError !== false) opts.logError = true;
    }

    const wrapper = async function (
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      const className = this.constructor.name;
      const methodName = `${className}.${propertyName}`;
      const logger = this.logger as Logger | undefined;

      if (!logger) {
        return originalMethod.apply(this, args);
      }

      const startTime = Date.now();

      if (opts.logStart) {
        logger.log(`${methodName} started`);
      }

      try {
        const result = await originalMethod.apply(this, args);
        const executionTime = Date.now() - startTime;

        if (opts.logEnd) {
          logger.log(`${methodName} completed (${executionTime}ms)`);
        }

        return result;
      } catch (error: unknown) {
        const executionTime = Date.now() - startTime;

        if (opts.logError) {
          logger.error(`${methodName} failed (${executionTime}ms)`, {
            error:
              error instanceof Error
                ? { message: error.message, name: error.name }
                : error,
          });
        }

        throw error;
      }
    };

    Object.defineProperty(wrapper, 'name', { value: propertyName });
    descriptor.value = wrapper;
    return descriptor;
  };
}
