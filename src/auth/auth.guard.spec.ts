import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import * as jwt from 'jsonwebtoken';

// Mock JWT secret for testing
const TEST_JWT_SECRET = 'test-jwt-secret-for-testing';

// Helper to create mock ExecutionContext
const createMockContext = (accessToken?: string): ExecutionContext => {
    const mockRequest = {
        headers: {
            authorization: accessToken ? `Bearer ${accessToken}` : undefined,
        },
    };

    return {
        switchToHttp: () => ({
            getRequest: () => mockRequest,
        }),
    } as ExecutionContext;
};

// Helper to create a valid JWT token
const createValidToken = (userId: string, expiresInSeconds: number = 3600) => {
    const payload = {
        sub: userId,
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256' });
};

// Helper to create an expired JWT token
const createExpiredToken = (userId: string) => {
    const payload = {
        sub: userId,
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
    };
    return jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256' });
};

describe('AuthGuard', () => {
    let guard: AuthGuard;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthGuard],
        }).compile();

        guard = module.get<AuthGuard>(AuthGuard);
    });

    afterEach(() => {
        delete process.env.SUPABASE_JWT_SECRET;
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    // ==================== MISSING TOKEN TESTS ====================
    describe('missing credentials', () => {
        it('should throw UnauthorizedException when access token is missing', async () => {
            const context = createMockContext(undefined);

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Missing access token');
        });
    });

    // ==================== INVALID TOKEN TESTS ====================
    describe('invalid token', () => {
        it('should throw UnauthorizedException for malformed token', async () => {
            const context = createMockContext('invalid-token-format');

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Invalid token');
        });

        it('should throw UnauthorizedException for expired token', async () => {
            const expiredToken = createExpiredToken('user-123');
            const context = createMockContext(expiredToken);

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Token expired');
        });
    });

    // ==================== VALID TOKEN TESTS ====================
    describe('valid token', () => {
        it('should allow access with valid token', async () => {
            const userId = 'user-123';
            const validToken = createValidToken(userId, 3600);
            const context = createMockContext(validToken);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
        });

        it('should set user on request after successful validation', async () => {
            const userId = 'user-123';
            const validToken = createValidToken(userId, 3600);

            const mockRequest: any = {
                headers: {
                    authorization: `Bearer ${validToken}`,
                },
            };

            const context = {
                switchToHttp: () => ({
                    getRequest: () => mockRequest,
                }),
            } as ExecutionContext;

            await guard.canActivate(context);

            expect(mockRequest.user).toBeDefined();
            expect(mockRequest.user.id).toBe(userId);
            expect(mockRequest.user.email).toBe('test@example.com');
        });
    });

    // ==================== MISSING SECRET TESTS ====================
    describe('missing JWT secret', () => {
        it('should throw UnauthorizedException when JWT secret is not configured', async () => {
            delete process.env.SUPABASE_JWT_SECRET;

            const module: TestingModule = await Test.createTestingModule({
                providers: [AuthGuard],
            }).compile();

            const guardWithoutSecret = module.get<AuthGuard>(AuthGuard);
            const validToken = createValidToken('user-123');
            const context = createMockContext(validToken);

            await expect(guardWithoutSecret.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guardWithoutSecret.canActivate(context)).rejects.toThrow('Server configuration error');
        });
    });
});
