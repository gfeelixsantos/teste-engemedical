import { Test, TestingModule } from '@nestjs/testing';
import { CustomerEmailCampaignService } from './customer-email-campaign.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('CustomerEmailCampaignService', () => {
  let service: CustomerEmailCampaignService;
  let supabaseServiceMock: any;

  beforeEach(async () => {
    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerEmailCampaignService,
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
      ],
    }).compile();

    service = module.get<CustomerEmailCampaignService>(CustomerEmailCampaignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a draft campaign in Supabase', async () => {
    const dto = {
      name: 'Test',
      scope: 'all' as const,
      subject: 'Subject',
      editorSource: {},
      htmlBody: '<p>Hi</p>',
      textBody: 'Hi',
      requestedByCodigo: '123'
    };
    const res = await service.createDraft(dto);
    expect(res).toBeDefined();
    expect(supabaseServiceMock.getClient().from).toHaveBeenCalledWith('customer_email_campaigns');
  });

  it('publishes a campaign', async () => {
    const res = await service.publishCampaign('test-id');
    expect(res).toBeDefined();
    expect(supabaseServiceMock.getClient().update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  it('cancels an active campaign', async () => {
    const res = await service.cancelCampaign('test-id');
    expect(res).toBeDefined();
    expect(supabaseServiceMock.getClient().rpc).toHaveBeenCalledWith('cancel_customer_email_campaign_pending', { p_campaign_id: 'test-id' });
  });
});
