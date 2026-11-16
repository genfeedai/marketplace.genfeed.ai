import { PurchaseQueryDto } from '@api/purchases/dto/purchase-query.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AdminPurchaseQueryDto extends PurchaseQueryDto {
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

  @ApiProperty({
    description:
      'Search purchases by listing title, seller display name, or stripe session',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
