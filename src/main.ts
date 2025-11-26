import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. ENABLE CORS HERE
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://vintagefrontend-i6mpc.ondigitalocean.app/',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Swagger Config (Existing)
  const config = new DocumentBuilder()
    .setTitle('Vintage E-Commerce API')
    .setDescription('The official API documentation for the Vintage backend.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // 3. Start Server (Ensure the port is different from Frontend)
  // Backend on 3001 or 3333 is common if Frontend is on 3000
  await app.listen(3333);
}
bootstrap();