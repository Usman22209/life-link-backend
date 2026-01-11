import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

// Mock Supabase client responses
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithIdToken: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signOut: jest.fn(),
    admin: {
      updateUserById: jest.fn(),
    },
  },
};

const mockSupabaseService = {
  client: mockSupabaseClient,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== SIGNUP TESTS ====================
  describe('signup', () => {
    const signupDto = { email: 'test@example.com', password: 'Password123!' };

    it('should successfully create a new user', async () => {
      const mockUser = { id: 'user-123', email: signupDto.email };
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.signup(signupDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Account created successfully');
      expect(result.user).toEqual(mockUser);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signupDto.email,
        password: signupDto.password,
        options: { emailRedirectTo: 'lifelink://auth/callback' },
      });
    });

    it('should throw BadRequestException when signup fails', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      await expect(service.signup(signupDto)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== LOGIN TESTS ====================
  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123!' };
    const mockSession = {
      access_token: 'access-token-123',
      refresh_token: 'refresh-token-123',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const mockUser = { id: 'user-123', email: loginDto.email, email_confirmed_at: new Date().toISOString() };

    it('should successfully login and return tokens', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('logged in successfully');
      expect(result.session.access_token).toBe(mockSession.access_token);
      expect(result.session.refresh_token).toBe(mockSession.refresh_token);
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unconfirmed email', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        'Please verify your email before logging in.',
      );
    });

    it('should throw UnauthorizedException for missing session', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: mockUser },
        error: null,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ==================== FORGOT PASSWORD TESTS ====================
  describe('forgotPassword', () => {
    it('should always return success (security: no email enumeration)', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await service.forgotPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should return success even when email does not exist', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' },
      });

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result.success).toBe(true); // Still returns success for security
    });
  });

  // ==================== GOOGLE LOGIN TESTS ====================
  describe('googleLogin', () => {
    const googleLoginDto = { idToken: 'google-id-token-123' };
    const mockSession = {
      access_token: 'access-token-123',
      refresh_token: 'refresh-token-123',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    const mockUser = { id: 'user-123', email: 'test@gmail.com' };

    it('should successfully login with Google', async () => {
      mockSupabaseClient.auth.signInWithIdToken.mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      });

      const result = await service.googleLogin(googleLoginDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Google');
      expect(result.session.access_token).toBe(mockSession.access_token);
      expect(result.session.refresh_token).toBe(mockSession.refresh_token);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException for invalid Google token', async () => {
      mockSupabaseClient.auth.signInWithIdToken.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid token' },
      });

      await expect(service.googleLogin(googleLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ==================== LOGOUT TESTS ====================
  describe('logout', () => {
    it('should call Supabase signOut', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const result = await service.logout();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Logged out successfully');
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  // ==================== RESET PASSWORD TESTS ====================
  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.resetPassword('user-123', 'NewPassword123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw BadRequestException when reset fails', async () => {
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: { user: null },
        error: { message: 'Link expired' },
      });

      await expect(service.resetPassword('user-123', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
