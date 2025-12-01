import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { PaymentModule } from './payment/payment.module';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    DatabaseModule,
    PaymentModule,
    UsersModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ProductsModule,
    OrdersModule,
  ],
  controllers: [AppController, AuthController],
  providers: [],
})
export class AppModule {}
