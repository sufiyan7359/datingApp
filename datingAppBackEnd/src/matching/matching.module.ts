import { Module } from '@nestjs/common';
import { SwipesController } from './swipes.controller';
import { SwipesService } from './swipes.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  controllers: [SwipesController, MatchesController],
  providers: [SwipesService, MatchesService],
})
export class MatchingModule {}
