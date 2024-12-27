import { Controller, Get, Put, Param } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('part')
export class PartController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async getParticipantes() {
    return this.prismaService.$queryRaw`
      SELECT id_part, CONCAT(apellidos, ', ', nombres) AS name FROM participante;
    `;
  }

  @Get(':id')
  async getParticipanteById(@Param('id') id: string) {
    return this.prismaService.getParticipanteById(id);
  }

  @Put(':id')
  async updateAsistencia(@Param('id') id: string) {
    const response = await this.prismaService.updateAsistencia(id);

    // Publicar resúmenes después del PUT
    console.log('Actualización realizada, publicando resúmenes...');
    await this.prismaService.publishSummariesByAges();
    await this.prismaService.publishRoomsByAgesAndGenre();

    return response;
  }
}
