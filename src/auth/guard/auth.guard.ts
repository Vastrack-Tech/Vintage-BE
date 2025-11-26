import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// This triggers the 'supabase' strategy defined above
@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase') {}
