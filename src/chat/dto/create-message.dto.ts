import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiPropertyOptional({ description: 'Thread ID if existing thread' })
  @IsOptional()
  @IsString()
  thread_id?: string;

  @ApiPropertyOptional({ description: 'Blood Request ID if starting new thread' })
  @IsOptional()
  @IsString()
  request_id?: string;

  @ApiProperty({ description: 'Message text content' })
  @IsNotEmpty()
  @IsString()
  text: string;
}
