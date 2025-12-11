import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Read the required roles from the @Roles decorator
        // getAllAndOverride checks the method first, then the class
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // 2. If no @Roles() decorator is present, do we block or allow?
        // Usually, if there's no role restriction, we assume it's open (or handled by AuthGuard)
        if (!requiredRoles) {
            return true;
        }

        // 3. Get the User (attached by SupabaseAuthGuard)
        const { user } = context.switchToHttp().getRequest();

        // 4. Check if user exists and has the matching role
        // We use .some() if a user can have multiple roles, or .includes() if simple string
        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException('Access denied. Insufficient permissions.');
        }

        return true;
    }
}