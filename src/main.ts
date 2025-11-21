import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      'JWT-auth', // This name here is important for matching @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Route setup (e.g., localhost:3000/api/docs)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keeps you logged in if you refresh the page
    },
  });

  await app.listen(3000);
}
bootstrap();