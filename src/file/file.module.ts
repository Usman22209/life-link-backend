import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  providers: [FileService],
  controllers: [FileController],
  imports: [SupabaseModule],
})
export class FileModule {}
