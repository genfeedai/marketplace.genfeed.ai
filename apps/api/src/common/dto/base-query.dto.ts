import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class BaseQueryDto {
  @ApiProperty({
    default: 1,
    description: 'Page number for pagination',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : 1,
  )
  page: number = 1;

  @ApiProperty({
    default: 10,
    description: 'Number of items per page',
    maximum: 100,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : 10,
  )
  limit: number = 10;

  @ApiProperty({
    default: true,
    description: 'Enable or disable pagination',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.pagination !== undefined)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return true;
    if (value === 'false' || value === false) return false;
    if (value === 'true' || value === true) return true;
    if (value === '0' || value === 0) return false;
    if (value === '') return false;
    return Boolean(value);
  })
  @IsBoolean()
  pagination: boolean = true;

  @ApiProperty({
    default: false,
    description: 'Filter by deleted status',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.isDeleted !== undefined)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return false;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return Boolean(value);
  })
  @IsBoolean()
  isDeleted: boolean = false;

  @ApiProperty({
    default: 'createdAt: -1',
    description: 'Sort field(s) and order',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value !== undefined && value !== null ? value : 'createdAt: -1',
  )
  sort: string = 'createdAt: -1';
}
