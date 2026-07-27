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
    // 1. First attempt standard signUp
    const { data: signUpData, error: signUpError } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    let user = signUpData?.user;

    if (signUpError) {
      // If user already exists, attempt to fetch user
      this.logger.warn(`signUp error for ${dto.email}: ${signUpError.message}`);
    }

    // 2. Auto-confirm user via Admin API so login & access tokens work seamlessly
    if (user && !user.email_confirmed_at) {
      try {
        await this.supabase.client.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
      } catch (adminErr) {
        this.logger.warn(`Could not auto-confirm user ${user.id}: ${adminErr.message}`);
      }
    }

    // 3. Perform login to obtain access_token & refresh_token
    const { data: loginData } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (loginData?.session) {
      return {
        success: true,
        message: 'Account created successfully.',
        session: {
          access_token: loginData.session.access_token,
          refresh_token: loginData.session.refresh_token,
          expires_at: loginData.session.expires_at,
        },
        user: {
          id: loginData.user.id,
          email: loginData.user.email,
          is_onboarded: loginData.user.app_metadata?.is_onboarded || false,
        },
      };
    }

    return {
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: user || null,
    };
  }

  async login(dto: LoginDto) {
    let { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error && error.code === 'email_not_confirmed') {
      try {
        const { data: usersData } = await this.supabase.client.auth.admin.listUsers();
        const existingUser = usersData?.users?.find((u) => u.email === dto.email);
        if (existingUser) {
          await this.supabase.client.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true,
          });
          const retry = await this.supabase.client.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
          });
          data = retry.data;
          error = retry.error;
        }
      } catch (confirmErr) {
        this.logger.error(`Could not auto-confirm email for ${dto.email}`, confirmErr.message);
      }
    }

    if (error || !data?.session) {
      this.logger.warn(`Login failed for ${dto.email}: ${error?.message}`);
      throw new UnauthorizedException(`Login failed: ${error?.message || 'Invalid login credentials'}`);
    }

    const session = data.session;
    const user = data.user;

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
        is_onboarded: user.app_metadata?.is_onboarded || false,
      },
    };
  }

  forgotPassword(email: string) {
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
        throw new UnauthorizedException(`Google login failed: ${error.message}`);
      }

      const { user, session } = data;

      if (!session) {
        throw new UnauthorizedException('Invalid session data');
      }

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
          is_onboarded: user.app_metadata?.is_onboarded || false,
        },
      };
    } catch (err) {
      this.logger.error('Google login error', err.message);
      throw new UnauthorizedException(`Google login failed: ${err.message}`);
    }
  }

  async logout(userId: string) {
    this.logger.log(`Logout requested for user ${userId}`);
    const { error } = await this.supabase.client.auth.admin.signOut(userId);

    if (error) {
      this.logger.error(`Logout failed for user ${userId}`, error.message);
    }

    return {
      success: true,
      message: 'Logged out successfully. All sessions revoked.',
    };
  }

  async resetPassword(userId: string, password: string) {
    const { data, error } = await this.supabase.client.auth.admin.updateUserById(
      userId,
      { password: password },
    );

    if (error) {
      this.logger.error(`Password reset failed for user ${userId}`, error.message);
      throw new BadRequestException(`Failed to reset password: ${error.message}`);
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

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.client.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      this.logger.warn('Token refresh failed', error.message);
      throw new UnauthorizedException(`Invalid or expired refresh token: ${error.message}`);
    }

    const { session, user } = data;

    if (!session || !user) {
      throw new UnauthorizedException('Invalid session data during refresh.');
    }

    return {
      success: true,
      message: 'Token refreshed successfully.',
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        is_onboarded: user.app_metadata?.is_onboarded || false,
      },
    };
  }
}
