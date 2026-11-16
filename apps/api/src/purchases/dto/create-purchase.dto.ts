import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({
    description: 'ID of the listing to purchase',
  })
  @IsString()
  listingId!: string;

  @ApiProperty({
    description: 'Discount code (optional)',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;
}
