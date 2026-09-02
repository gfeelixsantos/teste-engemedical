import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CustomerEmailCampaignService } from './customer-email-campaign.service';
import { CreateCustomerEmailCampaignDto, UpdateCustomerEmailCampaignDto } from './customer-email-campaign.types';

@Controller('customer-email-campaigns')
export class CustomerEmailCampaignController {
  constructor(private readonly campaignService: CustomerEmailCampaignService) {}

  @Post()
  async createDraft(@Body() dto: CreateCustomerEmailCampaignDto) {
    return this.campaignService.createDraft(dto);
  }

  @Put(':id')
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCustomerEmailCampaignDto) {
    return this.campaignService.updateCampaign(id, dto);
  }

  @Post(':id/publish')
  async publishCampaign(@Param('id') id: string) {
    return this.campaignService.publishCampaign(id);
  }

  @Post(':id/cancel')
  async cancelCampaign(@Param('id') id: string) {
    return this.campaignService.cancelCampaign(id);
  }

  @Post(':id/retrigger')
  async retriggerCampaign(@Param('id') id: string) {
    return this.campaignService.retriggerCampaign(id);
  }

  @Delete(':id')
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignService.deleteCampaign(id);
  }

  @Get()
  async listCampaigns() {
    return this.campaignService.listCampaigns();
  }

  @Get(':id')
  async getCampaign(@Param('id') id: string) {
    return this.campaignService.getCampaign(id);
  }

  @Get(':id/progress')
  async getCampaignProgress(@Param('id') id: string) {
    return this.campaignService.getCampaignProgress(id);
  }

  @Post('assets')
  async uploadAsset() {
    // To be implemented as per Task 3
    return { url: 'mock_asset_url' };
  }
}
