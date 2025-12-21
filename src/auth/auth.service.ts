import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RequestContextUtil } from '../common/utils/request-context.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        emailRedirectTo: 'lifelink://auth/callback',
      },
    });

    if (error) {
      this.logger.error(`Signup failed for ${dto.email}`, error.message);
      throw new BadRequestException(
        'We could not create your account. Please try again later.',
      );
    }

    return {
      success: true,
      message:
        'Account created successfully. Please check your email to verify your account.',
      user: data.user,
    };
  }

  async login(dto: LoginDto, req: Request) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      this.logger.warn(`Login failed for ${dto.email}`);

      if (error.code === 'email_not_confirmed') {
        throw new UnauthorizedException(
          'Please verify your email before logging in.',
        );
      }

      throw new UnauthorizedException(
        'Incorrect email or password. Please try again.',
      );
    }

    const session = data.session;
    const user = data.user;

    if (!session || !session.refresh_token || !session.expires_at) {
      throw new UnauthorizedException('Invalid session data');
    }

    // Generate session_id
    const { randomUUID } = await import('crypto');
    const sessionId = randomUUID();

    // Extract metadata from request (SECURE - not from frontend)
    const metadata = RequestContextUtil.extractMetadata(req);

    // Store session with session_id and metadata in database
    const sessionInsert = await this.supabase.client.from('sessions').insert({
      session_id: sessionId,
      user_id: user.id,
      refresh_token: session.refresh_token,
      refresh_token_expires_at: new Date(session.expires_at * 1000),
      // Metadata from request
      user_agent: metadata.userAgent,
      ip_address: metadata.ipAddress,
      browser: metadata.browser,
      os: metadata.os,
      device_type: metadata.deviceType,
    });

    if (sessionInsert.error) {
      this.logger.error(
        `Failed to store session for user ${user.id}`,
        sessionInsert.error,
      );
      // Continue with login even if session storage fails
    } else {
      this.logger.log(`Session stored successfully for user ${user.id}`);
    }

    // Return access token AND session_id to frontend
    return {
      success: true,
      message: 'You are logged in successfully.',
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
        session_id: sessionId, // Frontend must store this
      },
    };
  }

  async forgotPassword(email: string) {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: 'lifelink://auth/ChangePassword',
      },
    );

    if (error) {
      this.logger.error(
        `Forgot password request failed for ${email}`,
        error.message,
      );
    }

    return {
      success: true,
      message:
        'If an account with this email exists, we have sent a password reset link. Please check your inbox.',
    };
  }

  async googleLogin(dto: GoogleLoginDto, req: Request) {
    try {
      const { data, error } = await this.supabase.client.auth.signInWithIdToken(
        {
          provider: 'google',
          token: dto.idToken,
        },
      );

      if (error) {
        this.logger.warn('Google login failed', error.message);
        throw new UnauthorizedException('Google login failed.');
      }

      const { user, session } = data;

      if (!session || !session.refresh_token || !session.expires_at) {
        throw new UnauthorizedException('Invalid session data');
      }

      // Generate session_id
      const { randomUUID } = await import('crypto');
      const sessionId = randomUUID();

      // Extract metadata from request
      const metadata = RequestContextUtil.extractMetadata(req);

      // Store session with session_id and metadata in database
      const sessionInsert = await this.supabase.client.from('sessions').insert({
        session_id: sessionId,
        user_id: user.id,
        refresh_token: session.refresh_token,
        refresh_token_expires_at: new Date(session.expires_at * 1000),
        user_agent: metadata.userAgent,
        ip_address: metadata.ipAddress,
        browser: metadata.browser,
        os: metadata.os,
        device_type: metadata.deviceType,
      });

      if (sessionInsert.error) {
        this.logger.error(
          `Failed to store session for user ${user.id}`,
          sessionInsert.error,
        );
        // Continue with login even if session storage fails
      } else {
        this.logger.log(`Session stored successfully for user ${user.id}`);
      }

      // Return access token AND session_id to frontend
      return {
        success: true,
        message: 'Logged in successfully with Google.',
        session: {
          access_token: session.access_token,
          expires_at: session.expires_at,
          session_id: sessionId,
        },
      };
    } catch (err) {
      this.logger.error('Google login error', err.message);
      throw new UnauthorizedException('Google login failed.');
    }
  }

  async getSessions(userId: string) {
    const { data } = await this.supabase.client
      .from('sessions')
      .select('session_id, created_at, user_agent, ip_address, device_type, browser, os, last_refreshed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      success: true,
      sessions: data || [],
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.supabase.client
      .from('sessions')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId); // Ensure user can only delete their own sessions

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  async logout(sessionId: string) {
    await this.supabase.client
      .from('sessions')
      .delete()
      .eq('session_id', sessionId);

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }
}
