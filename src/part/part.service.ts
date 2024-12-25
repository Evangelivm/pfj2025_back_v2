import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WsGateway } from 'src/ws/ws.gateway'; // Importar el gateway para emitir eventos
import { RedisService } from 'src/redis/redis.service'; // Importar el servicio Redis

@Injectable()
export class PartService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WsGateway, // Inyecta el WebSocket Gateway
    private redisService: RedisService, // Inyecta el servicio Redis
  ) {}

  // Método para actualizar un participante y notificar a través de WebSocket y Redis
  async updateParticipante(id_part: number, data: any) {
    // 1. Actualiza los datos del participante en la base de datos
    const updatedParticipante = await this.prisma.participante.update({
      where: { id_part },
      data,
    });

    // 2. Notifica a través de WebSocket sobre la actualización
    //await this.wsGateway.notifyUpdate(id_part);

    // 3. Publica el mensaje a un canal de Redis para la notificación en otros servicios
    await this.redisService.publish(
      'participant-update',
      JSON.stringify({
        message: `Actualización de participante con ID ${id_part}`,
        updatedData: updatedParticipante,
      }),
    );

    return updatedParticipante;
  }
}
