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

  getAuthorizationUrl(vendorId: string): string {
    const state = this.signState(vendorId);
    const params = new URLSearchParams({
      client_id: this.config.getOrThrow('MP_CLIENT_ID'),
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: this.config.getOrThrow('MP_REDIRECT_URI'),
      state,
      scope: 'offline_access',
    });
    return `https://auth.mercadopago.com.uy/authorization?${params.toString()}`;
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

  async handleOAuthCallback(code: string, vendorId: string): Promise<void> {
    const token = await this.oauthTokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.getOrThrow('MP_REDIRECT_URI'),
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

  async createPreference(orderId: string): Promise<PreferenceResponse & { marketplaceFee: number }> {
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

    const feeRate = Number(this.config.get('MP_MARKETPLACE_FEE_RATE') ?? '0.08');
    const total = Number(order.total);
    const marketplaceFee = Math.round(total * feeRate * 100) / 100;
    const accessToken = this.decrypt(oauth.accessToken);

    const preference = await this.mpFetch<PreferenceResponse>(
      '/checkout/preferences',
      accessToken,
      {
        method: 'POST',
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
      [PaymentStatus.CANCELLED, PaymentStatus.REJECTED].includes(status) &&
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

    if ([PaymentStatus.REFUNDED, PaymentStatus.CHARGEBACK].includes(status)) {
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
    const body = new URLSearchParams({
      client_id: this.config.getOrThrow('MP_CLIENT_ID'),
      client_secret: this.config.getOrThrow('MP_CLIENT_SECRET'),
      ...data,
    });
    const response = await fetch(`${this.api}/oauth/token`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new BadGatewayException(`Mercado Pago OAuth: ${response.status} ${await response.text()}`);
    return response.json() as Promise<OAuthResponse>;
  }

  private async mpFetch<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.api}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new BadGatewayException(`Mercado Pago API: ${response.status} ${await response.text()}`);
    return response.json() as Promise<T>;
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
