import { Module } from '@nestjs/common';
import { BloodRequestService } from './blood-request.service';
import { BloodRequestController } from './blood-request.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  providers: [BloodRequestService],
  controllers: [BloodRequestController]
})
export class BloodRequestModule { }
