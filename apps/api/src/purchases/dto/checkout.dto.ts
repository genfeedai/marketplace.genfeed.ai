import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CheckoutDto {
  @ApiProperty({
    description: 'ID of the listing to purchase',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  listingId?: string;

  @ApiProperty({
    description: 'URL to redirect to after successful payment',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiProperty({
    description: 'URL to redirect to if payment is cancelled',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}
