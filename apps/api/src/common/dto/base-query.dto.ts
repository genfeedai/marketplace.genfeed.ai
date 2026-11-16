import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const MAX_PAGE_SIZE = 100;
const MAX_PAGE_NUMBER = 10_000;

export class BaseQueryDto {
  @ApiProperty({
    default: 1,
    description: 'Page number for pagination',
    maximum: MAX_PAGE_NUMBER,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_NUMBER)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : 1,
  )
  page = 1;

  @ApiProperty({
    default: 10,
    description: 'Number of items per page',
    maximum: MAX_PAGE_SIZE,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : 10,
  )
  limit = 10;

  @ApiProperty({
    default: '-createdAt',
    description:
      'Comma-separated sort fields; prefix a field with - for descending order',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? value : '-createdAt',
  )
  sort = '-createdAt';
}
