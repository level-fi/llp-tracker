import { EsModule } from '../es'
import { QueueModule } from '../queue'
import { TrancheModule } from '../tranche'
import { UtilModule } from '../util'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TimeframeService } from './timeFrame.service'

@Module({
  imports: [
    EsModule,
    ConfigModule,
    UtilModule,
    QueueModule.register(),
    TrancheModule,
  ],
  providers: [TimeframeService],
  exports: [TimeframeService],
})
export class TimeframeModule {}
