import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { SupabaseService } from '../supabase/supabase.service';

const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
};

const mockSupabaseService = {
    client: mockSupabaseClient,
};

describe('ProfileService', () => {
    let service: ProfileService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProfileService,
                {
                    provide: SupabaseService,
                    useValue: mockSupabaseService,
                },
            ],
        }).compile();

        service = module.get<ProfileService>(ProfileService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getProfile', () => {
        const userId = 'user-123';

        it('should successfully fetch a profile', async () => {
            const mockProfile = { id: userId, phone: '123456' };
            mockSupabaseClient.single.mockResolvedValue({ data: mockProfile, error: null });

            const result = await service.getProfile(userId);

            expect(result.success).toBe(true);
            expect(result.data.id).toEqual(mockProfile.id);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        });

        it('should throw NotFoundException when profile does not exist', async () => {
            mockSupabaseClient.single.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' }
            });

            await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException for other errors', async () => {
            mockSupabaseClient.single.mockResolvedValue({
                data: null,
                error: { code: 'OTHER', message: 'Database error' }
            });

            await expect(service.getProfile(userId)).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateProfile', () => {
        const userId = 'user-123';
        const updateDto = { phone: '987654', blood_group: 'O+' };

        it('should successfully update/upsert a profile', async () => {
            const mockUpdatedProfile = { id: userId, ...updateDto };
            mockSupabaseClient.single.mockResolvedValue({ data: mockUpdatedProfile, error: null });

            const result = await service.updateProfile(userId, updateDto as any);

            expect(result.success).toBe(true);
            expect(result.message).toContain('updated successfully');
            expect(result.data).toEqual(mockUpdatedProfile);
            expect(mockSupabaseClient.upsert).toHaveBeenCalled();
        });

        it('should throw BadRequestException when update fails', async () => {
            mockSupabaseClient.single.mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
            });

            await expect(service.updateProfile(userId, updateDto as any)).rejects.toThrow(BadRequestException);
        });
    });
});
