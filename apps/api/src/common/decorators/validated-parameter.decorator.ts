import { Body, Query, type Type, ValidationPipe } from '@nestjs/common';

function dtoPipe(dto: Type<unknown>): ValidationPipe {
  return new ValidationPipe({
    expectedType: dto,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

export function ValidatedBody(dto: Type<unknown>): ParameterDecorator {
  return Body(dtoPipe(dto));
}

export function ValidatedQuery(dto: Type<unknown>): ParameterDecorator {
  return Query(dtoPipe(dto));
}
