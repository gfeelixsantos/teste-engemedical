import { Test, TestingModule } from '@nestjs/testing';
import { AzureCustomerEmailCampaignWorkerService } from './azure.customer-email-campaign.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { EmailService } from 'src/nodemailer/nodemailer.service';

describe('AzureCustomerEmailCampaignWorkerService', () => {
  let service: AzureCustomerEmailCampaignWorkerService;
  let supabaseServiceMock: any;
  let emailServiceMock: any;

  beforeEach(async () => {
    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'campaign-1', status: 'active', content_version: 1 }, error: null }),
        update: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue({
          data: [{ id: 'row-1', company_code: '123', emails: ['test@test.com'], company_name: 'Test Inc' }],
          error: null
        }),
        in: jest.fn().mockReturnThis(),
      }),
    };

    emailServiceMock = {
      sendGenericEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureCustomerEmailCampaignWorkerService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
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
    // 1st single() call: fetch campaign at start
    supabaseServiceMock.getClient().single.mockResolvedValueOnce({ data: { id: 'campaign-1', status: 'active', content_version: 1 } });
    
    // 2nd single() call: fetch fresh campaign in the loop, simulating an edit (version 2)
    supabaseServiceMock.getClient().single.mockResolvedValueOnce({ data: { id: 'campaign-1', status: 'active', content_version: 2 } });
    
    await service['handleMessage']({ messageText: JSON.stringify({ campaignId: 'campaign-1' }) } as any);
    
    // Nodemailer should NOT be called because version is stale
    expect(emailServiceMock.sendGenericEmail).not.toHaveBeenCalled();
    // It should have updated the row to error
    expect(supabaseServiceMock.getClient().update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', error_log: expect.stringContaining('Conteúdo da campanha') })
    );
  });
});
