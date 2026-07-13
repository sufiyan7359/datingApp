import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Reflects any origin on port 4200 (localhost or a LAN IP) so the same
  // backend works for local dev in a browser and for a phone on the same
  // network hitting the dev server's LAN address. Dev-only - a deployed
  // build should pin this back down to a fixed list of real origins.
  app.enableCors({
    origin: /^http:\/\/(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):4200$/,
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DatingApp API')
    .setDescription('REST API for the DatingApp platform')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 8000;
  await app.listen(port as number, '0.0.0.0');
}
void bootstrap();
