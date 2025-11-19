import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';

@Module({
  imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
