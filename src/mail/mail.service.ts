import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class MailService {
    private mg: ReturnType<Mailgun['client']>;
    private domain: string;
    private fromEmail: string;
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly configService: ConfigService) {
        const mailgun = new Mailgun(FormData);
        this.mg = mailgun.client({
            username: 'api',
            key: this.configService.getOrThrow<string>('MAILGUN_API_KEY'),
        });
        this.domain = this.configService.getOrThrow<string>('MAILGUN_DOMAIN');
        this.fromEmail = this.configService.get<string>('MAIL_FROM') || 'Vintage Beauty <noreply@vintage.com>';
    }

    // --- 1. REUSABLE HTML TEMPLATE ---
    private getTemplate(title: string, bodyContent: string) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || '#';

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; color: #333; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { background-color: #000000; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; }
          .content { padding: 40px 30px; line-height: 1.6; }
          .footer { background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
          .btn { display: inline-block; background-color: #DC8404; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
          .status-badge { background-color: #f3f3f3; padding: 6px 12px; border-radius: 4px; font-weight: bold; border: 1px solid #ddd; text-transform: uppercase; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vintage Beauty</h1>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; font-weight: 600;">${title}</h2>
            ${bodyContent}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Vintage Beauty Care.</p>
            <p><a href="${frontendUrl}" style="color: #666;">Visit Website</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
    }

    // Generic Send Helper
    private async send(to: string, subject: string, html: string) {
        try {
            await this.mg.messages.create(this.domain, {
                from: this.fromEmail,
                to: [to],
                subject,
                html,
                text: html.replace(/<[^>]*>?/gm, ''), // Fallback text
            });
            this.logger.log(`Email sent to ${to}: ${subject}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
        }
    }

    // --- 2. SPECIFIC EMAIL METHODS ---

    // A. Contact Request Notification
    async sendRequestReceived(to: string, name: string) {
        const html = this.getTemplate(
            'Request Received',
            `
      <p>Hi ${name},</p>
      <p>We received your special request! Our team works hard to create custom beauty experiences tailored just for you.</p>
      <p>We will review your details and get back to you within <strong>24-48 hours</strong>.</p>
      <p>Thank you for choosing Vintage.</p>
      `
        );
        return this.send(to, 'We received your request! - Vintage Beauty', html);
    }

    // B. Order Status Update
    async sendOrderStatusUpdate(to: string, orderId: string, status: string, name: string) {
        // Format status nicely (e.g., 'shipped' -> 'Shipped')
        const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
        const orderUrl = `${this.configService.get('FRONTEND_URL')}/orders/${orderId}`;

        const html = this.getTemplate(
            'Order Update',
            `
      <p>Hi ${name},</p>
      <p>There is an update on your order <strong>#${orderId}</strong>.</p>
      <p style="margin: 20px 0;">Current Status: <span class="status-badge">${formattedStatus}</span></p>
      <p>You can view the full details and track your shipment in your account dashboard.</p>
      <a href="${orderUrl}" class="btn">View Order</a>
      `
        );
        return this.send(to, `Order Update: #${orderId} is ${formattedStatus}`, html);
    }

    // C. Welcome / Signup Email
    async sendWelcome(to: string, name: string) {
        const shopUrl = `${this.configService.get('FRONTEND_URL')}/shop`;
        const html = this.getTemplate(
            'Welcome to the Family',
            `
      <p>Hi ${name},</p>
      <p>Welcome to <strong>Vintage Beauty Care</strong>! We are thrilled to have you join our community of beauty enthusiasts.</p>
      <p>Explore our latest collection of premium hairs, wigs, and accessories designed just for you.</p>
      <a href="${shopUrl}" class="btn">Start Shopping</a>
      `
        );
        return this.send(to, 'Welcome to Vintage Beauty Care!', html);
    }

    async sendNewRequestAlert(data: { firstName: string; lastName: string; email: string; phone: string; request: string }) {
        // You should add ADMIN_EMAIL to your .env file, or fallback to a hardcoded one
        const adminEmail = this.configService.get('ADMIN_EMAIL') || 'admin@vintage.com';

        const html = this.getTemplate(
            'New Customer Request',
            `
      <p>You have received a new contact request from the website.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Customer:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.firstName} ${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Email:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Phone:</td>
          <td style="padding: 8px 0; font-weight: bold;">${data.phone}</td>
        </tr>
      </table>

      <div style="background-color: #f3f3f3; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; font-size: 10px; text-transform: uppercase; color: #888;">Request Message:</p>
        <p style="margin-top: 5px; font-style: italic;">"${data.request}"</p>
      </div>
      `
        );

        return this.send(adminEmail, `New Request from ${data.firstName}`, html);
    }

    async sendOrderReceipt(to: string, orderId: string, amount: string, items: any[]) {
        const itemList = items
            .map((i) => `<li>${i.quantity}x ${i.product?.title || 'Item'} - ${i.variantName || 'Standard'}</li>`)
            .join('');

        const html = `
      <h1>Order Confirmed!</h1>
      <p>Thank you for your purchase from Vintage Beauty Care.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Total:</strong> ${amount}</p>
      <h3>Items:</h3>
      <ul>${itemList}</ul>
      <p>We will notify you when your order ships.</p>
    `;
    }

}