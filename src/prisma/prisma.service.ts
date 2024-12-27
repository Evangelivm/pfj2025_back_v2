import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { WsGateway } from 'src/ws/ws.gateway';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly redisService: RedisService) {
    super({
      log: ['query', 'info', 'warn', 'error'], // Opcional: logs para monitoreo
    });
  }

  async onModuleInit() {
    await this.$connect();

    // Publicar los resúmenes al iniciar el backend
    console.log('Backend iniciado, publicando resúmenes...');
    await this.publishSummariesByAges();
    await this.publishRoomsByAgesAndGenre();
  }

  async onModuleDestroy() {
    await this.$disconnect(); // Cierra las conexiones al finalizar
  }

  // Método para obtener todos los participantes
  async getParticipantes() {
    const participantes = await this.$queryRaw<
      { id_part: number; name: string }[]
    >`SELECT id_part, CONCAT(apellidos, ', ', nombres) AS name FROM participante;`;

    console.log('Lista total consultada');
    return participantes;
  }

  // Método para obtener un participante por id_part
  async getParticipanteById(id: string) {
    const participante = await this.$queryRaw`
      SELECT 
        a.id_part, 
        b.compañia, 
        a.nombres, 
        a.apellidos, 
        c.habitacion, 
        a.edad, 
        d.estaca, 
        e.barrio 
      FROM participante a
      JOIN comp b ON a.\`compañia\` = b.comp_id
      JOIN habitacion c ON a.habitacion = c.habit_id
      JOIN estaca d ON a.estaca = d.est_id
      JOIN barrio e ON a.barrio = e.id_barrio
      WHERE a.id_part = ${id};
    `;

    const nombre = participante?.[0]?.nombres || 'Desconocido';
    const apellido = participante?.[0]?.apellidos || 'Desconocido';
    console.log(`Se consultó a ${nombre} ${apellido}`);

    return participante;
  }

  // Método para actualizar 'asistio' en la tabla asistencia
  async updateAsistencia(id: string) {
    const participante = await this.getParticipanteById(id); // Obtener el nombre

    // Ejecutamos la actualización de la asistencia
    await this.$executeRaw`
    UPDATE asistencia
    SET asistio = "Si"
    WHERE id_part = ${id};
  `;

    const nombre = participante?.[0]?.nombres || 'Desconocido';
    const apellido = participante?.[0]?.apellidos || 'Desconocido';
    console.log(`La asistencia de ${nombre} ${apellido} ha sido registrada`);

    return { message: 'Asistencia actualizada con éxito' };
  }
  // Método para ejecutar la consulta según la edad
  async getSummaryByAge(edad: number) {
    return this.$queryRaw`
      SELECT 
        a.compañia, 
        SUM(CASE WHEN a.sexo = 'H' THEN 1 ELSE 0 END) AS hombres, 
        SUM(CASE WHEN a.sexo = 'M' THEN 1 ELSE 0 END) AS mujeres 
      FROM 
        participante a 
      JOIN 
        asistencia b 
      ON 
        a.id_part = b.id_part 
      WHERE 
        a.compañia IN (
          SELECT compañia 
          FROM participante 
          WHERE edad = ${edad}
        ) 
        AND a.tipo = 'participante' 
        AND b.asistio = 'Si' 
      GROUP BY 
        a.compañia 
      ORDER BY 
        hombres DESC, 
        mujeres DESC;
    `;
  }

  // Método para ejecutar la consulta de habitaciones según la edad y género
  async getRoomsByAgesAndGenre(edad: number, genero: string) {
    const result = await this.$queryRaw`
    SELECT 
        a.habitacion, 
        a.nro_camas AS 'camas', 
        COUNT(b.id_part) AS 'registrados', 
        COUNT(CASE WHEN c.asistio = 'Si' THEN 1 END) AS 'ocupados',
        a.nro_camas - COUNT(CASE WHEN c.asistio = 'Si' THEN 1 END) AS 'libres'
    FROM habitacion a
    JOIN participante b ON a.habit_id = b.habitacion
    JOIN asistencia c ON b.id_part = c.id_part
    WHERE a.sexo = ${genero}  -- Filtro por género
      AND a.habit_id IN (
          SELECT habitacion
          FROM participante
          WHERE edad = ${edad}  -- Filtro por edad
          GROUP BY habitacion
      )
    GROUP BY a.habitacion, a.nro_camas;
  `;

    // Convertir los resultados a tipo number
    return (result as any).map((row) => ({
      ...row,
      registrados: Number(row.registrados),
      ocupados: Number(row.ocupados),
      libres: Number(row.libres),
    }));
  }

  // Método para publicar y guardar en Hashes
  async publishSummariesByAges() {
    const edades = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

    for (const edad of edades) {
      const summary = await this.getSummaryByAge(edad);
      const channel = `summary-age-${edad}`;
      const serializedSummary = JSON.stringify(summary);

      // Guardar el último mensaje en un Redis Hash
      await this.redisService.setHash(
        `last-message:${channel}`,
        'message',
        serializedSummary,
      );

      // Publicar el mensaje en el canal Pub/Sub
      await this.redisService.publish(channel, serializedSummary);

      console.log(
        `Publicado y guardado resumen para edad ${edad} en el canal ${channel}`,
      );
    }
  }
  // Método para publicar habitaciones y guardar en Hashes
  async publishRoomsByAgesAndGenre() {
    const edades = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    const generos = ['H', 'M'];
    for (const genero of generos) {
      for (const edad of edades) {
        const rooms = await this.getRoomsByAgesAndGenre(edad, genero);
        const channel = `rooms-age-${edad}-${genero}`;
        const serializedRooms = JSON.stringify(rooms);

        // Guardar el último mensaje en un Redis Hash
        await this.redisService.setHash(
          `last-message:${channel}`,
          'message',
          serializedRooms,
        );

        // Publicar el mensaje en el canal Pub/Sub
        await this.redisService.publish(channel, serializedRooms);

        console.log(
          `Publicado y guardado resumen para edad ${edad} y sexo ${genero} en el canal ${channel}`,
        );
      }
    }
  }

  // PrismaService - Agregar nueva consulta para obtener estacas
  async getEstacas() {
    const estacas = await this.$queryRaw<
      { est_id: number; estaca: string }[]
    >`SELECT est_id, estaca FROM estaca;`;

    console.log('Estacas consultadas:', estacas);
    return estacas;
  }
  // Método para obtener barrios por estaca
  async getBarriosByEstaca(estacaId: string) {
    return this.$queryRaw`
      SELECT id_barrio, barrio 
      FROM barrio 
      WHERE estaca = ${estacaId};
    `;
  }
  // Obtener el último mensaje desde Redis Hash
  async getLastMessage(channel: string) {
    const message = await this.redisService.getHashField(
      `last-message:${channel}`,
      'message',
    );
    return message ? JSON.parse(message) : null;
  }
}
