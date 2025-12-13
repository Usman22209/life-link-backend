import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
@Module({
  imports: [SupabaseModule,ConfigModule.forRoot(), AuthModule, FileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
  