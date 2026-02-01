import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [SupabaseModule, AuthModule, NotificationModule],
  providers: [DonationService],
  controllers: [DonationController]
})
export class DonationModule { }
