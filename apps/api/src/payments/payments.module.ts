import { Controller, Get, Module, Query, Res, UseGuards } from '@nestjs/common';
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
  connect(@CurrentUser() user: AuthUser) {
    return { authorizationUrl: this.mp.getAuthorizationUrl(user.tenantId!) };
  }

  @SystemContext()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const vendorId = this.mp.verifyState(state);
    await this.mp.handleOAuthCallback(code, vendorId);
    const web = (process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return res.redirect(`${web}/vendor/mercadopago?connected=1`);
  }
}

@Module({
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentsModule {}
