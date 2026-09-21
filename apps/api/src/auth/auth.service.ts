import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { DbService } from '../common/db.service';
import { LoginDto, RefreshDto, RegisterBuyerDto, RegisterVendorDto } from './dto';
import { StoreStatus, UserRole, UserStatus } from '@multiventas/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerBuyer(dto: RegisterBuyerDto) {
    await this.ensureEmailAvailable(dto.email);
    const user = await this.db.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        name: dto.name,
        phone: dto.phone,
        roles: [UserRole.BUYER],
      },
    });
    return this.issueTokens(user.id);
  }

  async registerVendor(dto: RegisterVendorDto) {
    await this.ensureEmailAvailable(dto.email);
    const slugExists = await this.db.client.store.findUnique({ where: { slug: dto.storeSlug } });
    if (slugExists) throw new BadRequestException('El slug de tienda ya existe');

    const user = await this.db.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        name: dto.name,
        phone: dto.phone,
        roles: [UserRole.BUYER, UserRole.VENDOR],
      },
    });

    const vendor = await this.db.client.vendor.create({
      data: { userId: user.id, businessName: dto.businessName },
    });

    await this.db.client.store.create({
      data: {
        tenantId: vendor.id,
        slug: dto.storeSlug,
        name: dto.storeName,
        status: StoreStatus.DRAFT,
      },
    });

    return this.issueTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.db.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueTokens(user.id);
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokenHash = this.hash(dto.refreshToken);
    const stored = await this.db.client.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token revocado o vencido');
    }

    await this.db.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(payload.sub);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    await this.db.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(userId: string) {
    const user = await this.db.client.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });
    if (!user) throw new UnauthorizedException();

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.vendor?.id,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get('JWT_ACCESS_TTL') ?? '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync({ sub: user.id }, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get('JWT_REFRESH_TTL') ?? '30d') as any,
    });

    const decoded = this.jwt.decode(refreshToken) as { exp?: number };
    await this.db.client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date((decoded.exp ?? Math.floor(Date.now() / 1000) + 2_592_000) * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        tenantId: user.vendor?.id,
      },
    };
  }

  private async ensureEmailAvailable(email: string) {
    const exists = await this.db.client.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) throw new BadRequestException('El email ya está registrado');
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
