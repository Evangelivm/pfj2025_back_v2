import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('estaca') // Ruta base 'estaca'
export class EstacaController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get() // Ruta GET para obtener todas las estacas
  async getEstacas() {
    return this.prismaService.getEstacas(); // Llamar al método de PrismaService para obtener las estacas
  }

  @Get(':id') // Ruta GET para obtener los barrios según la estaca
  async getBarriosByEstaca(@Param('id') id: string) {
    return this.prismaService.getBarriosByEstaca(id); // Llamar al método de PrismaService para obtener los barrios
  }
}
