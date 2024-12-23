import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher = createClient();
  private subscriber = createClient();

  async onModuleInit() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async onModuleDestroy() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    this.subscriber.subscribe(channel, (message) => {
      callback(message);
    });
  }
}
