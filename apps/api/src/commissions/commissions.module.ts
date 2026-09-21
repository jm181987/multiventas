import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { DbService } from '../common/db.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole } from '@multiventas/db';

@Injectable()
class CommissionsService {
  constructor(private readonly db: DbService) {}

  list() {
    return this.db.client.commission.findMany({
      include: { order: true, payment: true, vendor: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async summary() {
    const result = await this.db.client.commission.aggregate({
      _sum: { amount: true, baseAmount: true },
      _count: { id: true },
    });
    return result;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Controller('vendor/commissions')
class VendorCommissionsController {
  constructor(private readonly commissions: CommissionsService) {}
  @Get() list() { return this.commissions.list(); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/commissions')
class AdminCommissionsController {
  constructor(private readonly commissions: CommissionsService) {}
  @Get() list() { return this.commissions.list(); }
  @Get('summary') summary() { return this.commissions.summary(); }
}

@Module({
  controllers: [VendorCommissionsController, AdminCommissionsController],
  providers: [CommissionsService],
})
export class CommissionsModule {}
