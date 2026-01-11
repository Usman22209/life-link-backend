import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

// Mock AuthService
const mockAuthService = {
  signup: jest.fn(),
  login: jest.fn(),
  forgotPassword: jest.fn(),
  googleLogin: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
};

// Mock request object
const mockRequest = {
  user: { id: 'user-123', email: 'test@example.com' },
} as any;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== SIGNUP TESTS ====================
  describe('signup', () => {
    it('should call authService.signup with correct dto', async () => {
      const signupDto = { email: 'test@example.com', password: 'Password123!' };
      const expectedResponse = { success: true, message: 'Account created' };
      mockAuthService.signup.mockResolvedValue(expectedResponse);

      const result = await controller.signup(signupDto);

      expect(mockAuthService.signup).toHaveBeenCalledWith(signupDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==================== LOGIN TESTS ====================
  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      const expectedResponse = {
        success: true,
        session: { access_token: 'token', refresh_token: 'refresh' },
        user: { id: 'user-123' },
      };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==================== FORGOT PASSWORD TESTS ====================
  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with email', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };
      const expectedResponse = { success: true, message: 'Reset link sent' };
      mockAuthService.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto.email);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==================== GOOGLE LOGIN TESTS ====================
  describe('googleLogin', () => {
    it('should call authService.googleLogin with dto', async () => {
      const googleLoginDto = { idToken: 'google-id-token' };
      const expectedResponse = {
        success: true,
        session: { access_token: 'token', refresh_token: 'refresh' },
        user: { id: 'user-123' },
      };
      mockAuthService.googleLogin.mockResolvedValue(expectedResponse);

      const result = await controller.googleLogin(googleLoginDto);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(googleLoginDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==================== RESET PASSWORD TESTS ====================
  describe('resetPassword', () => {
    it('should call authService.resetPassword with userId and password', async () => {
      const resetPasswordDto = { password: 'NewPassword123!' };
      const expectedResponse = { success: true, message: 'Password reset' };
      mockAuthService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(resetPasswordDto, mockRequest);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        mockRequest.user.id,
        resetPasswordDto.password,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  // ==================== LOGOUT TESTS ====================
  describe('logout', () => {
    it('should call authService.logout', async () => {
      const expectedResponse = { success: true, message: 'Logged out' };
      mockAuthService.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout();

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(result).toEqual(expectedResponse);
    });
  });
});
