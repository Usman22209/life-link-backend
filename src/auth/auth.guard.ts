import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const authHeader = req.headers.authorization;
    const sessionId = req.headers['x-session-id'] as string;

    if (!authHeader || !sessionId) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    const accessToken = authHeader.replace('Bearer ', '');

    // 1️⃣ Try normal access token validation
    const { data, error } = await this.supabase.client.auth.getUser(
      accessToken,
    );

    if (!error && data?.user) {
      req['user'] = { id: data.user.id };
      return true;
    }

    // 2️⃣ Access token invalid → refresh using SESSION ID (no JWT decoding!)
    const { data: session, error: sessionError } =
      await this.supabase.client
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

    if (sessionError || !session) {
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    // 🔒 SECURITY CHECK: Verify refresh token hasn't expired
    const refreshTokenExpiry = new Date(session.refresh_token_expires_at);
    if (refreshTokenExpiry < new Date()) {
      // Refresh token is expired, clean up and reject
      await this.supabase.client
        .from('sessions')
        .delete()
        .eq('session_id', sessionId);

      throw new UnauthorizedException('Session expired, please login again');
    }

    // 3️⃣ Refresh token using Supabase
    const refreshResult = await this.supabase.client.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    if (
      refreshResult.error ||
      !refreshResult.data?.session ||
      !refreshResult.data?.user
    ) {
      // cleanup dead session
      await this.supabase.client
        .from('sessions')
        .delete()
        .eq('session_id', sessionId);

      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const newSession = refreshResult.data.session;
    if (!newSession.expires_at) {
      throw new UnauthorizedException('Invalid session data');
    }

    // 4️⃣ Update DB with rotated refresh token
    await this.supabase.client
      .from('sessions')
      .update({
        refresh_token: newSession.refresh_token,
        refresh_token_expires_at: new Date(newSession.expires_at * 1000),
        last_refreshed_at: new Date(),
      })
      .eq('session_id', sessionId);

    // 5️⃣ Send new access token to frontend
    res.setHeader('x-access-token', newSession.access_token);

    req['user'] = { id: refreshResult.data.user.id };
    return true;
  }
}
