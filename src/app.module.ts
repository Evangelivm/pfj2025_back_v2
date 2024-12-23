import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WsModule } from './ws/ws.module';
import { PartController } from './part/part.controller';
import { PartModule } from './part/part.module';
import { RedisService } from './redis/redis.service';
import { EstacaController } from './estaca/estaca.controller';

@Module({
  imports: [PrismaModule, WsModule, PartModule],
  controllers: [AppController, PartController, EstacaController],
  providers: [AppService, RedisService],
})
export class AppModule {}
