import { Controller, Delete, Get, Module, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { MercadoPagoService } from './mercado-pago.service';
import { AuthUser, CurrentUser, Roles, SystemContext } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole } from '@multiventas/db';

@Controller('payments/mercadopago')
class MercadoPagoController {
  constructor(private readonly mp: MercadoPagoService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('connect')
  async connect(@CurrentUser() user: AuthUser) {
    return { authorizationUrl: await this.mp.getAuthorizationUrl(user.tenantId!) };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.mp.getVendorConnectionStatus(user.tenantId!);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Delete('disconnect')
  disconnect(@CurrentUser() user: AuthUser) {
    return this.mp.disconnectVendor(user.tenantId!);
  }

  @SystemContext()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Query('error_description') oauthErrorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const web = (process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    if (oauthError) {
      console.error('Mercado Pago OAuth authorization error', oauthError, oauthErrorDescription ?? '');
      return res.redirect(`${web}/vendor/mercadopago?connected=0&error=authorization_denied`);
    }

    try {
      if (!code || !state) throw new Error('Callback OAuth incompleto');
      const vendorId = this.mp.verifyState(state);
      await this.mp.handleOAuthCallback(code, state, vendorId);
      return res.redirect(`${web}/vendor/mercadopago?connected=1`);
    } catch (error) {
      console.error('Mercado Pago OAuth callback failed', error);
      return res.redirect(`${web}/vendor/mercadopago?connected=0&error=oauth_failed`);
    }
  }
}

@Module({
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentsModule {}
