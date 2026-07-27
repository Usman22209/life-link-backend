import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportTicketDto {
  @ApiProperty({ description: 'Ticket subject' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Detailed support query message' })
  @IsNotEmpty()
  @IsString()
  message: string;
}
