import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3001'], // Orígenes permitidos
    methods: 'GET,PUT,POST', // Métodos permitidos
    allowedHeaders: 'Content-Type, Accept', // Encabezados permitidos
    credentials: true, // Habilitar el envío de cookies y cabeceras de autenticación
  });

  await app.listen(3000);
}
bootstrap();
