import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { PaymentModule } from './payment/payment.module';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { RequestsModule } from './requests/request.module';
import { ReviewsModule } from './reviews/review.module';

@Module({
  imports: [
    DatabaseModule,
    PaymentModule,
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ProductsModule,
    OrdersModule,
    WishlistModule,
    SupportModule,
    AdminModule,
    RequestsModule,
    ReviewsModule,
  ],
  controllers: [AppController, AuthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
  }
}