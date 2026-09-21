import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { DbService } from '../common/db.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole } from '@multiventas/db';

@Injectable()
class AdminService {
  constructor(private readonly db: DbService) {}

  async dashboard() {
    const [users, vendors, stores, products, orders, gross, commissions] = await Promise.all([
      this.db.client.user.count({ where: { deletedAt: null } }),
      this.db.client.vendor.count({ where: { deletedAt: null } }),
      this.db.client.store.count({ where: { deletedAt: null } }),
      this.db.client.product.count({ where: { deletedAt: null } }),
      this.db.client.order.count(),
      this.db.client.order.aggregate({ _sum: { total: true } }),
      this.db.client.commission.aggregate({ _sum: { amount: true } }),
    ]);
    return {
      users,
      vendors,
      stores,
      products,
      orders,
      grossSales: gross._sum.total ?? 0,
      platformCommissions: commissions._sum.amount ?? 0,
    };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
}

@Module({ controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
