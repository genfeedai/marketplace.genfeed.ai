import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class SalesPeriodDto {
  @ApiProperty({
    description: 'Only purchases created at or after this moment (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiProperty({
    description: 'Only purchases created at or before this moment (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
