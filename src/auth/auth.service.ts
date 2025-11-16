import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Signup successful. Please verify your email.',
      user: data.user,
    };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (error.code === 'email_not_confirmed') {
        throw new UnauthorizedException('Email not confirmed');
      }
      throw new UnauthorizedException(error.message);
    }

    return {
      message: 'Login successful',
      session: data.session,
    };
  }
}
