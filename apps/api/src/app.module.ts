import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './common/db.module';
import { TenantInterceptor } from './common/tenant.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CommissionsModule } from './commissions/commissions.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ConversationsModule } from './conversations/conversations.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    DbModule,
    StorageModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    StoresModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    PaymentsModule,
    OrdersModule,
    WebhooksModule,
    CommissionsModule,
    PromotionsModule,
    ReviewsModule,
    NotificationsModule,
    FavoritesModule,
    AnalyticsModule,
    ConversationsModule,
    RecommendationsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TenantInterceptor }],
})
export class AppModule {}
