import { Module, Global } from '@nestjs/common';
import { databaseProvider } from './database.provider';

// console.log('Is databaseProvider defined?', databaseProvider);

@Global()
@Module({
  providers: [databaseProvider],
  exports: [databaseProvider], // Essential: Exports the provider so other modules can use it
})
export class DatabaseModule {}
