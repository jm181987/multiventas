import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterBuyerDto, RegisterVendorDto } from './dto';
import { CurrentUser, SystemContext } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@SystemContext()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register/buyer')
  registerBuyer(@Body() dto: RegisterBuyerDto) {
    return this.auth.registerBuyer(dto);
  }

  @Post('register/vendor')
  registerVendor(@Body() dto: RegisterVendorDto) {
    return this.auth.registerVendor(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  session(@CurrentUser() user: unknown) {
    return user;
  }
}
