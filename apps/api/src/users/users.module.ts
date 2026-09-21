import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, Param, Patch, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DbService } from '../common/db.service';
import { CurrentUser, Roles, AuthUser } from '../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { UserRole, UserStatus } from '@multiventas/db';
import { StorageService } from '../storage/storage.module';

class UpdateMeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
}

class AdminUserStatusDto {
  @IsIn([UserStatus.ACTIVE, UserStatus.SUSPENDED])
  status!: UserStatus;
}

@Injectable()
class UsersService {
  constructor(private readonly db: DbService, private readonly storage: StorageService) {}

  private normalize<T>(user: T): T {
    const value = user as any;
    if (!value) return user;
    return {
      ...value,
      avatarUrl: value.avatarUrl ? this.storage.normalizeMediaUrl(value.avatarUrl) : null,
    } as T;
  }

  async me(id: string) {
    const user = await this.db.client.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true, roles: true, status: true, createdAt: true },
    });
    return this.normalize(user);
  }

  list() {
    return this.db.client.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, avatarUrl: true, roles: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    const user = await this.db.client.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true, roles: true, status: true, createdAt: true },
    });
    return this.normalize(user);
  }

  async uploadAvatar(id: string, file: any) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    if (!String(file.mimetype ?? '').startsWith('image/')) throw new BadRequestException('El archivo debe ser una imagen');

    const uploaded = await this.storage.uploadUserAvatar(
      id,
      file.originalname ?? 'avatar.jpg',
      file.mimetype,
      file.buffer,
    );

    const user = await this.db.client.user.update({
      where: { id },
      data: { avatarUrl: uploaded.publicUrl },
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true, roles: true, status: true, createdAt: true },
    });
    return this.normalize(user);
  }

  async removeAvatar(id: string) {
    const user = await this.db.client.user.update({
      where: { id },
      data: { avatarUrl: null },
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true, roles: true, status: true, createdAt: true },
    });
    return this.normalize(user);
  }

  setStatus(id: string, status: UserStatus) {
    return this.db.client.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, name: true, avatarUrl: true, roles: true, status: true, createdAt: true },
    });
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

  @Patch('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: any) {
    return this.users.uploadAvatar(user.sub, file);
  }

  @Delete('me/avatar')
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.users.removeAvatar(user.sub);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  list() { return this.users.list(); }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  setStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() dto: AdminUserStatusDto) {
    if (actor.sub === id && dto.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('No puedes suspender tu propia cuenta administrativa');
    }
    return this.users.setStatus(id, dto.status);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) { return this.users.remove(id); }
}

@Module({ controllers: [UsersController], providers: [UsersService] })
export class UsersModule {}
