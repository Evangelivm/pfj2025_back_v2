import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from 'src/redis/redis.service';

@Module({
  providers: [PrismaService, RedisService],
  exports: [PrismaService],
})
export class PrismaModule {}
