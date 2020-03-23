import { NestApplication, NestFactory } from '@nestjs/core';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/public/' });
  app.enableCors();
  await app.listen(3000);
}
bootstrap();
