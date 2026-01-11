import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(async () => {
    // Setup environment variables before tests
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupabaseService],
    }).compile();

    service = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have a client property', () => {
    expect(service.client).toBeDefined();
  });

  it('should throw error when SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;

    expect(() => {
      new SupabaseService();
    }).toThrow('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  });

  it('should throw error when SUPABASE_SERVICE_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.SUPABASE_SERVICE_KEY;

    expect(() => {
      new SupabaseService();
    }).toThrow('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  });
});
