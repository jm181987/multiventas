import { BadGatewayException, BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommissionStatus, OAuthProvider, OrderStatus, PaymentProvider, PaymentStatus } from '@multiventas/db';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { DbService } from '../common/db.service';

type OAuthResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  user_id?: number | string;
  public_key?: string;
  live_mode?: boolean;
};

export type PreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
};

@Injectable()
export class MercadoPagoService {
  private readonly api = 'https://api.mercadopago.com';

  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService,
  ) {}

  async getAuthorizationUrl(vendorId: string): Promise<string> {
    const marketplace = await this.getRuntimeMarketplaceConfig();
    const state = this.signState(vendorId);
    const redirectUri = this.getOAuthRedirectUri();
    const params = new URLSearchParams({
      client_id: marketplace.clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: redirectUri,
      state,
    });
    return `https://auth.mercadopago.com.uy/authorization?${params.toString()}`;
  }

  async getMarketplaceAdminConfig() {
    const saved = await this.db.client.marketplaceConfig.findUnique({
      where: { provider: PaymentProvider.MERCADO_PAGO },
    });
    const runtime = await this.getRuntimeMarketplaceConfig();
    return {
      provider: 'MERCADO_PAGO',
      accountEmail: saved?.accountEmail ?? null,
      clientId: runtime.clientId,
      hasClientSecret: Boolean(saved?.clientSecretEncrypted || this.config.get('MP_CLIENT_SECRET')),
      feeRate: runtime.feeRate,
      source: saved ? 'database' : 'environment',
      redirectUri: this.getOAuthRedirectUri(),
      webhookUrl: this.config.get('MP_WEBHOOK_URL') ?? null,
    };
  }

  async updateMarketplaceAdminConfig(input: {
    accountEmail?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
    feeRate?: number;
  }) {
    const existing = await this.db.client.marketplaceConfig.findUnique({
      where: { provider: PaymentProvider.MERCADO_PAGO },
    });

    const clientSecretEncrypted = input.clientSecret?.trim()
      ? this.encrypt(input.clientSecret.trim())
      : existing?.clientSecretEncrypted ?? null;

    await this.db.client.marketplaceConfig.upsert({
      where: { provider: PaymentProvider.MERCADO_PAGO },
      create: {
        id: 'mercado_pago',
        provider: PaymentProvider.MERCADO_PAGO,
        accountEmail: input.accountEmail?.trim() || null,
        clientId: input.clientId?.trim() || null,
        clientSecretEncrypted,
        feeRate: input.feeRate ?? Number(this.config.get('MP_MARKETPLACE_FEE_RATE') ?? '0.08'),
      },
      update: {
        accountEmail: input.accountEmail === undefined ? undefined : (input.accountEmail?.trim() || null),
        clientId: input.clientId === undefined ? undefined : (input.clientId?.trim() || null),
        clientSecretEncrypted,
        feeRate: input.feeRate,
      },
    });

    return this.getMarketplaceAdminConfig();
  }

  verifyState(state: string): string {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) throw new UnauthorizedException('State OAuth inválido');
    const expected = createHmac('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET')).update(encoded).digest('base64url');
    if (!safeEqual(signature, expected)) throw new UnauthorizedException('State OAuth inválido');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { vendorId: string; exp: number };
    if (payload.exp < Date.now()) throw new UnauthorizedException('State OAuth vencido');
    return payload.vendorId;
  }

  async handleOAuthCallback(code: string, state: string, vendorId: string): Promise<void> {
    if (!code) throw new BadRequestException('Mercado Pago no devolvió authorization code');
    const token = await this.oauthTokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.getOAuthRedirectUri(),
      state,
    });
    await this.db.client.oAuthToken.upsert({
      where: { tenantId_provider: { tenantId: vendorId, provider: OAuthProvider.MERCADO_PAGO } },
      create: {
        tenantId: vendorId,
        provider: OAuthProvider.MERCADO_PAGO,
        accessToken: this.encrypt(token.access_token),
        refreshToken: token.refresh_token ? this.encrypt(token.refresh_token) : null,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
        providerUserId: token.user_id ? String(token.user_id) : null,
      },
      update: {
        accessToken: this.encrypt(token.access_token),
        refreshToken: token.refresh_token ? this.encrypt(token.refresh_token) : undefined,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
        providerUserId: token.user_id ? String(token.user_id) : undefined,
      },
    });
  }

  async getVendorConnectionStatus(vendorId: string) {
    const token = await this.db.client.oAuthToken.findUnique({
      where: { tenantId_provider: { tenantId: vendorId, provider: OAuthProvider.MERCADO_PAGO } },
      select: {
        expiresAt: true,
        scope: true,
        providerUserId: true,
        updatedAt: true,
      },
    });

    return {
      connected: Boolean(token),
      expiresAt: token?.expiresAt ?? null,
      scope: token?.scope ?? null,
      providerUserId: token?.providerUserId ?? null,
      updatedAt: token?.updatedAt ?? null,
      reconnectRequired: token ? token.expiresAt.getTime() <= Date.now() : false,
      redirectUri: this.getOAuthRedirectUri(),
    };
  }

  async disconnectVendor(vendorId: string) {
    await this.db.client.oAuthToken.deleteMany({
      where: { tenantId: vendorId, provider: OAuthProvider.MERCADO_PAGO },
    });
    return { disconnected: true };
  }

  async refreshTokenIfNeeded(vendorId: string, force = false): Promise<void> {
    const token = await this.db.client.oAuthToken.findUnique({
      where: { tenantId_provider: { tenantId: vendorId, provider: OAuthProvider.MERCADO_PAGO } },
    });
    if (!token) throw new BadRequestException('El vendedor no conectó Mercado Pago');
    if (!force && token.expiresAt.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) return;
    if (!token.refreshToken) throw new BadRequestException('Mercado Pago requiere reconexión OAuth');

    const refreshed = await this.oauthTokenRequest({
      grant_type: 'refresh_token',
      refresh_token: this.decrypt(token.refreshToken),
    });

    await this.db.client.oAuthToken.update({
      where: { id: token.id },
      data: {
        accessToken: this.encrypt(refreshed.access_token),
        refreshToken: refreshed.refresh_token ? this.encrypt(refreshed.refresh_token) : token.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        scope: refreshed.scope ?? token.scope,
        providerUserId: refreshed.user_id ? String(refreshed.user_id) : token.providerUserId,
      },
    });
  }

  async createPreference(orderId: string, deviceId?: string): Promise<PreferenceResponse & { marketplaceFee: number }> {
    const order = await this.db.client.order.findUnique({
      where: { id: orderId },
      include: { items: true, vendor: true, payment: true },
    });
    if (!order) throw new BadRequestException('Orden inexistente');

    await this.refreshTokenIfNeeded(order.tenantId);
    const oauth = await this.db.client.oAuthToken.findUnique({
      where: { tenantId_provider: { tenantId: order.tenantId, provider: OAuthProvider.MERCADO_PAGO } },
    });
    if (!oauth) throw new BadRequestException('Vendedor sin Mercado Pago');

    const feeRate = (await this.getRuntimeMarketplaceConfig()).feeRate;
    const total = Number(order.total);
    const marketplaceFee = Math.round(total * feeRate * 100) / 100;
    const accessToken = this.decrypt(oauth.accessToken);

    const preference = await this.mpFetch<PreferenceResponse>(
      '/checkout/preferences',
      accessToken,
      {
        method: 'POST',
        headers: deviceId ? { 'X-meli-session-id': deviceId } : undefined,
        body: JSON.stringify({
          items: order.items.map((item) => ({
            id: item.productId ?? item.id,
            title: item.title,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: order.currency,
          })),
          marketplace_fee: marketplaceFee,
          external_reference: order.id,
          notification_url: this.config.getOrThrow('MP_WEBHOOK_URL'),
          back_urls: {
            success: `${this.config.getOrThrow('WEB_PUBLIC_URL')}/checkout/success?order=${order.id}`,
            pending: `${this.config.getOrThrow('WEB_PUBLIC_URL')}/checkout/pending?order=${order.id}`,
            failure: `${this.config.getOrThrow('WEB_PUBLIC_URL')}/checkout/failure?order=${order.id}`,
          },
          auto_return: 'approved',
        }),
      },
    );

    const payment = await this.db.client.payment.upsert({
      where: { orderId: order.id },
      create: {
        tenantId: order.tenantId,
        orderId: order.id,
        provider: PaymentProvider.MERCADO_PAGO,
        status: PaymentStatus.PENDING,
        amount: order.total,
        feeAmount: marketplaceFee,
        mpPreferenceId: preference.id,
        externalReference: order.id,
        raw: preference as any,
      },
      update: {
        mpPreferenceId: preference.id,
        feeAmount: marketplaceFee,
        raw: preference as any,
      },
    });

    await this.db.client.commission.upsert({
      where: { orderId: order.id },
      create: {
        tenantId: order.tenantId,
        orderId: order.id,
        paymentId: payment.id,
        rate: feeRate,
        baseAmount: order.total,
        amount: marketplaceFee,
        status: CommissionStatus.PENDING,
      },
      update: { paymentId: payment.id, rate: feeRate, amount: marketplaceFee },
    });

    return { ...preference, marketplaceFee };
  }

  validateWebhookSignature(signature: string, requestId: string, dataId: string) {
    if (!signature || !requestId || !dataId) throw new UnauthorizedException('Webhook incompleto');
    const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=', 2)));
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) throw new UnauthorizedException('Firma webhook inválida');
    const normalizedDataId = dataId.toLowerCase();
    const manifest = `id:${normalizedDataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', this.config.getOrThrow('MP_WEBHOOK_SECRET'))
      .update(manifest)
      .digest('hex');
    if (!safeEqual(v1, expected)) throw new UnauthorizedException('Firma webhook inválida');
  }

  async handleWebhook(payload: any, signature: string, requestId: string, dataId: string) {
    this.validateWebhookSignature(signature, requestId, dataId);
    return this.processWebhookNotification(payload);
  }

  async processWebhookNotification(payload: any) {
    if (payload?.type !== 'payment' || !payload?.data?.id) return { ignored: true };
    const providerUserId = payload.user_id ? String(payload.user_id) : undefined;
    let oauth = providerUserId
      ? await this.db.client.oAuthToken.findFirst({ where: { provider: OAuthProvider.MERCADO_PAGO, providerUserId } })
      : null;
    if (!oauth) throw new BadRequestException('No se pudo asociar el webhook a un vendedor');

    await this.refreshTokenIfNeeded(oauth.tenantId);
    oauth = await this.db.client.oAuthToken.findUnique({ where: { id: oauth.id } });
    if (!oauth) throw new BadRequestException('Token Mercado Pago inexistente');

    const remote = await this.mpFetch<any>(`/v1/payments/${payload.data.id}`, this.decrypt(oauth.accessToken));
    const orderId = remote.external_reference as string | undefined;
    if (!orderId) return { ignored: true };

    const payment = await this.db.client.payment.findUnique({ where: { orderId } });
    if (!payment) return { ignored: true };

    const previousStatus = payment.status;
    const status = mapPaymentStatus(remote.status);

    await this.db.client.payment.update({
      where: { id: payment.id },
      data: {
        status,
        mpPaymentId: String(remote.id),
        raw: remote,
        paidAt: status === PaymentStatus.APPROVED ? new Date(remote.date_approved ?? Date.now()) : undefined,
      },
    });

    if (status === PaymentStatus.APPROVED) {
      await this.db.client.order.update({ where: { id: orderId }, data: { status: OrderStatus.PAID } });
      await this.db.client.commission.updateMany({
        where: { orderId },
        data: { status: CommissionStatus.CONFIRMED },
      });
    } else if (
      (status === PaymentStatus.CANCELLED || status === PaymentStatus.REJECTED) &&
      previousStatus === PaymentStatus.PENDING
    ) {
      const order = await this.db.client.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (order?.status === OrderStatus.PENDING) {
        await this.db.client.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CANCELLED },
        });
        for (const item of order.items) {
          if (item.productId) {
            await this.db.client.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
    }

    if (status === PaymentStatus.REFUNDED || status === PaymentStatus.CHARGEBACK) {
      await this.db.client.commission.updateMany({
        where: { orderId },
        data: { status: CommissionStatus.REFUNDED },
      });
    }

    return { processed: true, orderId, status };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async refreshExpiringTokens() {
    await this.db.runSystem(async () => {
      const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const tokens = await this.db.client.oAuthToken.findMany({
        where: { provider: OAuthProvider.MERCADO_PAGO, expiresAt: { lte: soon } },
        select: { tenantId: true },
      });
      for (const token of tokens) {
        try {
          await this.refreshTokenIfNeeded(token.tenantId, true);
        } catch (error) {
          console.error('No se pudo renovar token MP', token.tenantId, error);
        }
      }
    });
  }

  private async oauthTokenRequest(data: Record<string, string>): Promise<OAuthResponse> {
    const marketplace = await this.getRuntimeMarketplaceConfig();
    const body = new URLSearchParams({
      client_id: marketplace.clientId,
      client_secret: marketplace.clientSecret,
      ...data,
    });

    const response = await fetch(`${this.api}/oauth/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Mercado Pago OAuth error', response.status, detail);
      throw new BadGatewayException(
        response.status === 400
          ? 'Mercado Pago rechazó OAuth. Verifica Client ID, Client Secret y que MP_REDIRECT_URI coincida exactamente con la Redirect URL configurada.'
          : `Mercado Pago OAuth no disponible (HTTP ${response.status})`,
      );
    }

    return response.json() as Promise<OAuthResponse>;
  }

  private async mpFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.api}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error('Mercado Pago API error', path, response.status, detail);
      throw new BadGatewayException(`Mercado Pago rechazó la operación (HTTP ${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private async getRuntimeMarketplaceConfig() {
    const saved = await this.db.client.marketplaceConfig.findUnique({
      where: { provider: PaymentProvider.MERCADO_PAGO },
    });

    const clientId = saved?.clientId?.trim() || this.config.get<string>('MP_CLIENT_ID')?.trim();
    const clientSecret = saved?.clientSecretEncrypted
      ? this.decrypt(saved.clientSecretEncrypted)
      : this.config.get<string>('MP_CLIENT_SECRET')?.trim();

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Configura Client ID y Client Secret de Mercado Pago en Administración');
    }

    return {
      clientId,
      clientSecret,
      feeRate: saved ? Number(saved.feeRate) : Number(this.config.get('MP_MARKETPLACE_FEE_RATE') ?? '0.08'),
      accountEmail: saved?.accountEmail ?? null,
    };
  }

  private getOAuthRedirectUri() {
    const configured = this.config.get<string>('MP_REDIRECT_URI')?.trim();
    if (configured && this.isValidOAuthRedirect(configured)) {
      return configured.replace(/\/$/, '');
    }

    const webPublic = this.config.get<string>('WEB_PUBLIC_URL')
      ?.split(',')[0]
      ?.trim();
    const webBase = this.toOAuthHttpsBase(webPublic);
    if (webBase) {
      return `${webBase}/api/payments/mercadopago/callback`;
    }

    const apiPublic = this.config.get<string>('API_PUBLIC_URL')?.trim();
    const apiBase = this.toOAuthHttpsBase(apiPublic);
    if (apiBase) {
      return `${apiBase}/api/payments/mercadopago/callback`;
    }

    throw new BadRequestException(
      'Mercado Pago necesita una Redirect URL HTTPS fija. Configura WEB_PUBLIC_URL con tu dominio HTTPS o define MP_REDIRECT_URI explícitamente.',
    );
  }

  private isValidOAuthRedirect(value: string) {
    try {
      const url = new URL(value);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      return (url.protocol === 'https:' || (isLocal && url.protocol === 'http:'))
        && !url.search
        && !url.hash;
    } catch {
      return false;
    }
  }

  private toOAuthHttpsBase(value?: string) {
    if (!value) return null;
    try {
      const url = new URL(value);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (!isLocal) url.protocol = 'https:';
      if (!isLocal && url.protocol !== 'https:') return null;
      if (isLocal && !['http:', 'https:'].includes(url.protocol)) return null;
      url.search = '';
      url.hash = '';
      url.pathname = url.pathname.replace(/\/+$/, '');
      return url.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }

  private signState(vendorId: string) {
    const encoded = Buffer.from(JSON.stringify({
      vendorId,
      exp: Date.now() + 10 * 60 * 1000,
      nonce: randomBytes(12).toString('hex'),
    })).toString('base64url');
    const signature = createHmac('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET')).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  private encryptionKey() {
    const key = Buffer.from(this.config.getOrThrow('TOKEN_ENCRYPTION_KEY'), 'base64');
    if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY debe decodificar exactamente 32 bytes');
    return key;
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
  }

  private decrypt(value: string) {
    const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(ivRaw, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}

function mapPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved': return PaymentStatus.APPROVED;
    case 'rejected': return PaymentStatus.REJECTED;
    case 'cancelled': return PaymentStatus.CANCELLED;
    case 'refunded': return PaymentStatus.REFUNDED;
    case 'charged_back': return PaymentStatus.CHARGEBACK;
    default: return PaymentStatus.PENDING;
  }
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
