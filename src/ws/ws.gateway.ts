import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service'; // Importa PrismaService
import { RedisService } from 'src/redis/redis.service'; // Importa RedisService

@WebSocketGateway()
export class WsGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private prismaService: PrismaService, // PrismaService inyectado
    private redisService: RedisService, // RedisService inyectado
  ) {}

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): void {
    console.log('Mensaje recibido:', data);
    this.server.emit('message', `Respuesta del servidor: ${data}`);
  }

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  // Método para notificar a todos los clientes sobre una actualización
  async notifyUpdate(id_part: number) {
    const participante = await this.prismaService.participante.findUnique({
      where: { id_part },
    });
    if (participante) {
      this.server.emit('db-update', {
        message: `Actualización de asistencia de ${participante.nombres} ${participante.apellidos}`,
        data: participante,
      });

      await this.redisService.publish(
        'participant-update',
        JSON.stringify({
          message: `Actualización de asistencia para el participante con ID ${id_part}`,
          data: participante,
        }),
      );
    }
  }
}
