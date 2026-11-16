import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordCreditPurchaseDto {
  @ApiProperty({ description: 'Listing the buyer paid for with credits' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  listingId!: string;

  @ApiProperty({ description: 'Opaque id of the buyer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  buyerId!: string;

  @ApiProperty({ description: 'Organization the credits were taken from' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  organizationId!: string;

  @ApiProperty({
    description: 'Credits taken. Must equal the listing GEN price.',
  })
  @IsInt()
  @Min(1)
  creditsPaid!: number;

  @ApiProperty({ description: 'Key that makes a retried call safe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  idempotencyKey!: string;
}

export class RefundCreditPurchaseDto {
  @ApiProperty({ description: 'Key the purchase was recorded under' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  idempotencyKey!: string;

  @ApiPropertyOptional({
    description:
      'With the other call fields: when no purchase exists under the key, ' +
      'record the key as refunded so a record call that is still in flight ' +
      'cannot complete it later.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  listingId?: string;

  @ApiPropertyOptional({ description: 'Opaque id of the buyer' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  buyerId?: string;

  @ApiPropertyOptional({ description: 'Organization the credits came from' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Credits that were taken' })
  @IsOptional()
  @IsInt()
  @Min(1)
  creditsPaid?: number;
}
