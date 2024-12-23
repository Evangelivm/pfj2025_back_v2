import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;

  constructor() {
    this.publisher = createClient();
    this.subscriber = createClient();
  }

  async onModuleInit() {
    await this.publisher.connect();
    await this.subscriber.connect();

    console.log('Redis publisher y subscriber conectados.');
  }

  async onModuleDestroy() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();

    console.log('Redis publisher y subscriber desconectados.');
  }

  async publish(channel: string, message: string) {
    // Guarda el último mensaje en un Hash antes de publicarlo
    await this.publisher.hSet(`last-message:${channel}`, 'message', message);
    await this.publisher.publish(channel, message);
    console.log(`Mensaje publicado en canal ${channel}:`, message);
  }

  async subscribe(channel: string, callback: (message: string) => void) {
    this.subscriber.subscribe(channel, (message) => {
      console.log(`Mensaje recibido en canal ${channel}:`, message);
      callback(message);
    });
  }

  async getLastMessage(channel: string): Promise<string | null> {
    // Recupera el último mensaje almacenado en el Hash
    return await this.publisher.hGet(`last-message:${channel}`, 'message');
  }
}
