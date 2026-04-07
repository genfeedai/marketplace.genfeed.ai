import type { Logger } from '@nestjs/common';

interface WithLogger {
  logger?: Logger;
}

/**
 * Automatically handles error logging and re-throwing for service methods.
 */
export function HandleErrors(operation: string, context?: string) {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: WithLogger, ...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error: unknown) {
        const logger = this.logger;
        const serviceName = target.constructor.name;

        if (logger) {
          logger.error(
            `${serviceName}.${propertyKey} failed: ${(error as Error)?.message}`,
            {
              context: context || propertyKey,
              operation,
            },
          );
        }

        throw error;
      }
    };

    return descriptor;
  };
}
