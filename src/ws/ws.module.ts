import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { PrismaModule } from 'src/prisma/prisma.module'; // Importa el PrismaModule
import { RedisService } from 'src/redis/redis.service'; // Importa RedisService

@Module({
  imports: [PrismaModule], // Asegúrate de incluir PrismaModule aquí
  providers: [WsGateway, RedisService], // Asegúrate de que el RedisService y WsGateway estén en providers
})
export class WsModule {}
