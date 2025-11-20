import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // This returns the object you built in jwt.strategy.ts validate() method
    // { userId: '...', email: '...', role: '...' }
    return request.user;
  },
);
