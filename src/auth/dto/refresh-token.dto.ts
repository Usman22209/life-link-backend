import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'The refresh token received during login or previous refresh',
        example: 'v1.refresh_token.eyJhbGciOiJIUzI1NiIs...',
    })
    @IsNotEmpty()
    @IsString()
    refresh_token: string;
}
