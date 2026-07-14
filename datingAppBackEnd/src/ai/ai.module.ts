import { Module } from '@nestjs/common';
import { FakeProfileDetectionService } from './fake-profile-detection.service';

@Module({
  providers: [FakeProfileDetectionService],
  exports: [FakeProfileDetectionService],
})
export class AiModule {}
