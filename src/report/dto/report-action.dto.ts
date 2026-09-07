import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportActionDto {
    @ApiProperty({
        description: 'Updated resolution status',
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        example: 'resolved',
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['pending', 'reviewed', 'resolved', 'dismissed'])
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';

    @ApiPropertyOptional({
        description: 'Moderation action taken on the target entity',
        enum: ['none', 'warning_issued', 'request_cancelled', 'user_suspended', 'user_banned', 'content_removed', 'dismissed'],
        default: 'none',
    })
    @IsOptional()
    @IsString()
    @IsIn(['none', 'warning_issued', 'request_cancelled', 'user_suspended', 'user_banned', 'content_removed', 'dismissed'])
    action_taken?: 'none' | 'warning_issued' | 'request_cancelled' | 'user_suspended' | 'user_banned' | 'content_removed' | 'dismissed';

    @ApiPropertyOptional({
        description: 'Admin audit notes or reason for resolution',
        example: 'Request verified as fraudulent. Cancelled request and notified users.',
    })
    @IsOptional()
    @IsString()
    admin_notes?: string;
}
