import { Body, Controller, Delete, Get, Injectable, Module, Param, Patch, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { CurrentUser, Roles, AuthUser } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole } from '@multiventas/db';

class UpdateMeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
class UsersService {
  constructor(private readonly db: DbService) {}
  me(id: string) {
    return this.db.client.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, roles: true, status: true, createdAt: true },
    });
  }
  list() {
    return this.db.client.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, roles: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
  updateMe(id: string, dto: UpdateMeDto) {
    return this.db.client.user.update({ where: { id }, data: dto, select: { id: true, email: true, name: true, phone: true } });
  }
  remove(id: string) {
    return this.db.client.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users')
class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.users.me(user.sub); }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.sub, dto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  list() { return this.users.list(); }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) { return this.users.remove(id); }
}

@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
