import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    config: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    const secret = config.getOrThrow<string>('SUPABASE_JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SUPABASE_JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, payload.email),
    });

    // Return the object that will be attached to @CurrentUser()
    return {
      userId: payload.sub,
      email: payload.email,
      localId: user?.id || null,
      role: user?.role || 'user',
      firstName: user?.firstName,
      lastName: user?.lastName,
      phone: user?.phone,
      address: user?.address,
      birthday: user?.birthday,
      notifyEmail: user?.notifyEmail,
      notifyPhone: user?.notifyPhone,
      referralCode: user?.referralCode,
    };
  }
}
