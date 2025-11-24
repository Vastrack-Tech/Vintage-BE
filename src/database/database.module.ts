import { Module, Global } from '@nestjs/common';
import { databaseProvider } from './database.provider';

// console.log('Is databaseProvider defined?', databaseProvider);

@Global()
@Module({
  providers: [databaseProvider],
  exports: [databaseProvider],
})
export class DatabaseModule {}
