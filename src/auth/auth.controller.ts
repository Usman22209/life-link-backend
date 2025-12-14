import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'User signup' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Account created successfully. Please check your email to verify your account.',
        },
        user: { type: 'object', description: 'User object from Supabase' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'You are logged in successfully.' },
        session: {
          type: 'object',
          description: 'Session object from Supabase',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'If an account with this email exists, we have sent a password reset link. Please check your inbox.',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('google-login')
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({
    status: 200,
    description: 'Google login successful.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Logged in successfully with Google.',
        },
        user: { type: 'object', description: 'User object from Supabase' },
        session: {
          type: 'object',
          description: 'Session object from Supabase',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }
}
