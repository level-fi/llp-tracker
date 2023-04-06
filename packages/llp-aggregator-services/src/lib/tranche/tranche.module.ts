import { QueueModule } from '../queue'
import { UtilModule } from '../util'
import { Module } from '@nestjs/common'
import { TrancheService } from './tranche.service'

@Module({
  imports: [QueueModule.register(), UtilModule],
  providers: [TrancheService],
  exports: [TrancheService],
})
export class TrancheModule {}
