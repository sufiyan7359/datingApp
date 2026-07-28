import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';

@Module({
  imports: [ChatModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}
