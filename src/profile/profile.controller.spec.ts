import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';

const mockProfileService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
};

const mockRequest = {
    user: { id: 'user-123' },
} as any;

describe('ProfileController', () => {
    let controller: ProfileController;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                {
                    provide: ProfileService,
                    useValue: mockProfileService,
                },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ProfileController>(ProfileController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getProfile', () => {
        it('should call profileService.getProfile with userId from request', async () => {
            const expectedResponse = { success: true, profile: { id: 'user-123' } };
            mockProfileService.getProfile.mockResolvedValue(expectedResponse);

            const result = await controller.getProfile(mockRequest);

            expect(mockProfileService.getProfile).toHaveBeenCalledWith(mockRequest.user.id);
            expect(result).toEqual(expectedResponse);
        });
    });

    describe('updateProfile', () => {
        it('should call profileService.updateProfile with userId and dto', async () => {
            const updateDto = { phone: '123456' };
            const expectedResponse = { success: true, message: 'Updated' };
            mockProfileService.updateProfile.mockResolvedValue(expectedResponse);

            const result = await controller.updateProfile(mockRequest, updateDto as any);

            expect(mockProfileService.updateProfile).toHaveBeenCalledWith(mockRequest.user.id, updateDto);
            expect(result).toEqual(expectedResponse);
        });
    });
});
