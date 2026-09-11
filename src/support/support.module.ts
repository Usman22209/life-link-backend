import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ReportModule } from '../report/report.module';

@Module({
    imports: [SupabaseModule, ReportModule],
    controllers: [SupportController],
    providers: [SupportService],
    exports: [SupportService],
})
export class SupportModule { }
