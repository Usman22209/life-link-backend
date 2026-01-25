import { Controller, Post, Body, UseGuards, Req, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from './auth.guard';
import { SwaggerResponses } from './swagger/auth-responses';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signup')
  @ApiOperation({
    summary: 'Create new user account',
    description: 'Register a new user with email and password. Email verification required before login.',
  })
  @ApiResponse(SwaggerResponses.signup.success)
  @ApiResponse(SwaggerResponses.signup.badRequest)
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticate user and receive access_token + refresh_token. Frontend handles token refresh directly with Supabase.',
  })
  @ApiResponse(SwaggerResponses.login.success)
  @ApiResponse(SwaggerResponses.login.unauthorized)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset email',
    description: 'Send password reset link to user email. Always returns success to prevent email enumeration.',
  })
  @ApiResponse(SwaggerResponses.forgotPassword.success)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('google-login')
  @ApiOperation({
    summary: 'Login with Google OAuth',
    description: 'Authenticate using Google ID token. Creates new account if user doesn\'t exist.',
  })
  @ApiResponse(SwaggerResponses.googleLogin.success)
  @ApiResponse(SwaggerResponses.googleLogin.unauthorized)
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Patch('reset-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset password using access token',
    description: 'Update the user password. Requires the access token received from a recovery link.',
  })
  @ApiResponse(SwaggerResponses.resetPassword.success)
  @ApiResponse(SwaggerResponses.resetPassword.badRequest)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.authService.resetPassword(req.user.id, dto.password);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate all sessions and refresh tokens on the server for this user.',
  })
  @ApiResponse(SwaggerResponses.logout.success)
  logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new access token and refresh token.',
  })
  @ApiResponse(SwaggerResponses.refresh.success)
  @ApiResponse(SwaggerResponses.refresh.unauthorized)
  refresh(@Body() dto: RefreshTokenDto) {
    console.log('Refresh DTO received:', dto);
    return this.authService.refreshSession(dto.refresh_token);
  }
}
