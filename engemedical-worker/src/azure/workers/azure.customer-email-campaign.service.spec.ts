import { Test, TestingModule } from '@nestjs/testing';
import { AzureCustomerEmailCampaignWorkerService } from './azure.customer-email-campaign.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AzureQueueService } from 'src/azure/azure-queue.service';

describe('AzureCustomerEmailCampaignWorkerService', () => {
  let service: AzureCustomerEmailCampaignWorkerService;
  let supabaseServiceMock: any;
  let azureQueueServiceMock: any;

  function createSupabaseMock(overrides: any = {}) {
    const defaults = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'campaign-1', status: 'active', content_version: 1 }, error: null }),
      update: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
      in: jest.fn().mockReturnThis(),
    };
    return { ...defaults, ...overrides };
  }

  beforeEach(async () => {
    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue(createSupabaseMock()),
    };

    azureQueueServiceMock = {
      sendEmailMessage: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureCustomerEmailCampaignWorkerService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: AzureQueueService, useValue: azureQueueServiceMock },
      ],
    }).compile();

    service = module.get<AzureCustomerEmailCampaignWorkerService>(AzureCustomerEmailCampaignWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('aborts if campaign is cancelled', async () => {
    supabaseServiceMock.getClient().single.mockResolvedValueOnce({ data: { id: 'campaign-1', status: 'cancelling' } });
    await service['handleMessage']({ messageText: JSON.stringify({ campaignId: 'campaign-1' }) } as any);
    expect(supabaseServiceMock.getClient().rpc).not.toHaveBeenCalled();
  });

  it('fails company row if content version is stale', async () => {
    const company = { id: 'row-1', company_code: '123', emails: ['test@test.com'], company_name: 'Test Inc' };

    // 1st single() call: fetch campaign at start (active, version 1)
    supabaseServiceMock.getClient().single.mockResolvedValueOnce({ data: { id: 'campaign-1', status: 'active', content_version: 1 } });

    // rpc returns one company
    supabaseServiceMock.getClient().rpc.mockResolvedValueOnce({ data: [company], error: null });

    // 2nd single() call: fresh campaign check in loop (version bumped to 2 = stale)
    supabaseServiceMock.getClient().single.mockResolvedValueOnce({ data: { id: 'campaign-1', status: 'active', content_version: 2 } });

    // 3rd single() call: after continue, rpc returns empty (no more companies)
    supabaseServiceMock.getClient().rpc.mockResolvedValueOnce({ data: [], error: null });

    // select for remaining pending count
    supabaseServiceMock.getClient().in.mockReturnThis();
    supabaseServiceMock.getClient().single.mockResolvedValue({ data: null, error: null });

    await service['handleMessage']({ messageText: JSON.stringify({ campaignId: 'campaign-1' }) } as any);

    // AzureQueueService should NOT be called because version is stale
    expect(azureQueueServiceMock.sendEmailMessage).not.toHaveBeenCalled();
    // It should have updated the row to 'failed'
    expect(supabaseServiceMock.getClient().update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', last_error: expect.stringContaining('Conteúdo da campanha') })
    );
  });
});
