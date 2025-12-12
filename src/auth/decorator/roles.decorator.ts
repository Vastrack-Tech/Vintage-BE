import { SetMetadata } from '@nestjs/common';

// This key matches what we will look for in the Guard
export const ROLES_KEY = 'roles';

// This decorator allows us to write @Roles('admin') in our controllers
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);