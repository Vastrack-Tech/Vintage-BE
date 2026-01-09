import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        console.log('Current User in RolesGuard:', user);

        if (!user || !requiredRoles.includes(user.role)) {
            console.log(`Access Denied. User Role: ${user?.role}, Required: ${requiredRoles}`);
            throw new ForbiddenException('Access denied. Insufficient permissions.');
        }

        return true;
    }
}