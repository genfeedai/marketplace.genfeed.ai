import { CreateListingDto } from '@api/listings/dto/create-listing.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateListingDto extends PartialType(CreateListingDto) {}
