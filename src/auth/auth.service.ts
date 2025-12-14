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

  constructor(private readonly supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
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

    return {
      success: true,
      message: 'You are logged in successfully.',
      session: data.session,
    };
  }

  async forgotPassword(email: string) {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: 'https://google.com',
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

      return {
        success: true,
        message: 'Logged in successfully with Google.',
        user,
        session,
      };
    } catch (err) {
      this.logger.error('Google login error', err.message);
      throw new UnauthorizedException('Google login failed.');
    }
  }
}
