import { SalesPeriodDto } from '@api/purchases/dto/sales-period.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const MAX_DAYS = 3650;

export class AdminAnalyticsQueryDto extends SalesPeriodDto {
  @ApiProperty({
    default: 30,
    description:
      'Days the daily sales list covers when no from or to is given; totals stay all time',
    maximum: MAX_DAYS,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DAYS)
  days?: number;
}
