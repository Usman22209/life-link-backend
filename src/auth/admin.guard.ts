import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  email?: string;
  [key: string]: unknown;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private readonly JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    if (!this.JWT_SECRET) {
      this.logger.error('SUPABASE_JWT_SECRET not configured');
      throw new UnauthorizedException('Server configuration error');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }

    // Check is_admin flag in profiles table
    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('is_admin')
      .eq('id', payload.sub)
      .maybeSingle();

    if (profileError || !profile) {
      this.logger.warn(`Admin check failed for user ${payload.sub}: profile not found`);
      throw new ForbiddenException('Access denied');
    }

    if (!profile.is_admin) {
      this.logger.warn(`Non-admin user ${payload.sub} attempted admin route`);
      throw new ForbiddenException('Admin access required');
    }

    req['user'] = {
      id: payload.sub,
      email: payload.email,
      is_admin: true,
    };

    this.logger.debug(`Admin access granted for ${payload.sub}`);
    return true;
  }
}
