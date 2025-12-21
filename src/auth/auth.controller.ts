import { Controller, Post, Body, UseGuards, Req, Get, Delete, Param } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthGuard } from './auth.guard';
import { SwaggerResponses, SwaggerHeaders } from './swagger/auth-responses';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    description: 'Authenticate user and receive access token + session ID. Both must be stored by frontend.',
  })
  @ApiResponse(SwaggerResponses.login.success)
  @ApiResponse(SwaggerResponses.login.unauthorized)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset email',
    description: 'Send password reset link to user email. Always returns success to prevent email enumeration.',
  })
  @ApiResponse(SwaggerResponses.forgotPassword.success)
  @ApiResponse(SwaggerResponses.forgotPassword.badRequest)
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
  googleLogin(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    return this.authService.googleLogin(dto, req);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user and invalidate session',
    description: 'Deletes the current session from database. Requires both Authorization header and X-Session-Id.',
  })
  @ApiHeader(SwaggerHeaders.authorization)
  @ApiHeader(SwaggerHeaders.sessionId)
  @ApiResponse(SwaggerResponses.logout.success)
  @ApiResponse(SwaggerResponses.logout.unauthorized)
  logout(@Req() req) {
    const sessionId = req.headers['x-session-id'];
    return this.authService.logout(sessionId);
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active sessions',
    description: 'Retrieve all active sessions for the current user with device information and activity timestamps.',
  })
  @ApiHeader(SwaggerHeaders.authorization)
  @ApiHeader(SwaggerHeaders.sessionId)
  @ApiResponse(SwaggerResponses.sessions.success)
  @ApiResponse(SwaggerResponses.sessions.unauthorized)
  async getSessions(@Req() req: any) {
    return this.authService.getSessions(req.user.id);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Delete a specific session (logout from specific device). User can only revoke their own sessions.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Session ID to revoke',
    example: 'b2c3d4e5-f6g7-8901-bcde-f01234567891',
    type: 'string',
  })
  @ApiHeader(SwaggerHeaders.authorization)
  @ApiHeader({
    ...SwaggerHeaders.sessionId,
    description: 'Current session ID (the session making the request, not the one being revoked)',
  })
  @ApiResponse(SwaggerResponses.revokeSession.success)
  @ApiResponse(SwaggerResponses.revokeSession.unauthorized)
  @ApiResponse(SwaggerResponses.revokeSession.notFound)
  async revokeSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(req.user.id, sessionId);
  }
}
