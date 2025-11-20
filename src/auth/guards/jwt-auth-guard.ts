import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // You can add custom logic here if needed, but
  // for standard JWT protection, this empty class is enough.
}