import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001', // Permitir conexiones desde el origen http://localhost:3001
    methods: ['GET', 'POST'],
  },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  // Manejar conexión de un cliente
  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  // Manejar desconexión de un cliente
  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Método para suscribirse dinámicamente a un canal basado en la edad
   * @param age Edad del participante
   * @param client Conexión del cliente
   */
  @SubscribeMessage('subscribeToChannel')
  async subscribeToAgeChannel(
    @MessageBody() age: number,
    @ConnectedSocket() client: Socket,
  ) {
    const channel = `${age}`;

    try {
      // Obtener el último mensaje del canal desde Redis
      const lastMessage = await this.prismaService.getLastMessage(channel);

      // Enviar el último mensaje al cliente (si existe)
      if (lastMessage) {
        client.emit(channel, lastMessage);
      }

      // Suscribirse al canal en Redis
      await this.redisService.subscribe(channel, (message) => {
        console.log(`Nuevo mensaje en ${channel}:`, message);

        // Emitir el mensaje a todos los clientes conectados al canal
        this.server.to(channel).emit(channel, message);
      });

      // Hacer que el cliente se una al canal en Socket.IO
      client.join(channel);

      console.log(`Cliente ${client.id} suscrito al canal ${channel}`);
    } catch (error) {
      console.error(
        `Error al suscribir al cliente ${client.id} al canal ${channel}:`,
        error,
      );
      client.emit('error', {
        message: `No se pudo suscribir al canal ${channel}.`,
        error: error.message,
      });
    }
  }
}
