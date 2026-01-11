import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  email?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

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

    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;

      // Attach user to request
      req['user'] = {
        id: payload.sub,
        email: payload.email,
      };

      this.logger.debug(`Auth successful for user ${payload.sub}`);
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
