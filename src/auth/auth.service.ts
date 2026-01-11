import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) { }

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

  async login(dto: LoginDto) {
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

    if (!session) {
      throw new UnauthorizedException('Invalid session data');
    }

    // Return tokens directly - frontend handles refresh with Supabase
    return {
      success: true,
      message: 'You are logged in successfully.',
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
      },
    };
  }

  forgotPassword(email: string) {
    // Fire-and-forget: Send email in background, return immediately
    // Supabase handles non-existent users securely (no email sent, no error)
    this.supabase.client.auth
      .resetPasswordForEmail(email, {
        redirectTo: 'lifelink://auth/ResetPassword',
      })
      .catch((error) => {
        this.logger.error(
          `Background password reset failed for ${email}`,
          error.message,
        );
      });

    // Return immediately (~10ms) - email sends in background
    return {
      success: true,
      message:
        'If an account with this email exists, we have sent a password reset link. Please check your inbox.',
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
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

      if (!session) {
        throw new UnauthorizedException('Invalid session data');
      }

      // Return tokens directly - frontend handles refresh with Supabase
      return {
        success: true,
        message: 'Logged in successfully with Google.',
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        },
        user: {
          id: user.id,
          email: user.email,
        },
      };
    } catch (err) {
      this.logger.error('Google login error', err.message);
      throw new UnauthorizedException('Google login failed.');
    }
  }

  async logout() {
    // With stateless JWT, logout is handled on frontend by clearing tokens
    // Optionally call Supabase to invalidate server-side
    await this.supabase.client.auth.signOut();

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }

  async resetPassword(userId: string, password: string) {
    const { data, error } = await this.supabase.client.auth.admin.updateUserById(
      userId,
      { password: password },
    );

    if (error) {
      this.logger.error(`Password reset failed for user ${userId}`, error.message);
      throw new BadRequestException('Failed to reset password. Link may be expired.');
    }

    return {
      success: true,
      message: 'Password has been reset successfully.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  }
}
