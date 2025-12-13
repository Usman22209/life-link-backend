import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const authHeader = (req.headers.authorization ||
      req.headers.Authorization) as string | undefined;

    let token: string | undefined;

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      const { data, error } = await this.supabase.client.auth.getUser(
        token as string,
      );

      if (error || !data?.user) {
        throw new UnauthorizedException(
          error?.message || 'Invalid access token',
        );
      }

      req['user'] = {
        id: data.user.id,
      };

      return true;
    } catch (err: any) {
      throw new UnauthorizedException(err?.message || 'Invalid access token');
    }
  }
}
