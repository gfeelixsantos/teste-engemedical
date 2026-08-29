import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import {
  IUserSettingsResponse,
  IUserSettingsFullResponse,
  IUserSettingsRequest,
} from './user-settings.interface';

@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get(':userCodigo')
  async getUserSettings(
    @Param('userCodigo') userCodigo: string,
  ): Promise<IUserSettingsFullResponse> {
    console.log(
      '[DEBUG CONTROLLER] Buscando configurações do usuário:',
      userCodigo,
    );
    const result = await this.userSettingsService.getUserSettings(userCodigo);
    console.log(
      '[DEBUG CONTROLLER] Resultado da busca:',
      JSON.stringify(result),
    );
    return result;
  }

  @Post()
  async saveUserSettings(
    @Body() settings: IUserSettingsRequest,
  ): Promise<IUserSettingsResponse> {
    console.log('[DEBUG CONTROLLER] Recebido:', JSON.stringify(settings));
    return this.userSettingsService.saveUserSettings(settings);
  }
}
