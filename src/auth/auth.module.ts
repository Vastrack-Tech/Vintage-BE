import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStrategy } from './strategies/supabase.strategy';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'supabase' }),
  ],
  controllers: [AuthController],
  providers: [SupabaseStrategy],
  exports: [PassportModule, SupabaseStrategy],
})
export class AuthModule {}
