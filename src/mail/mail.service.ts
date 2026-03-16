import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private mailchimp: any;
  private fromEmail: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    // 👇 FIX: Use native require to bypass the TypeScript "not a function" error
    const MailchimpTransactional = require('@mailchimp/mailchimp_transactional');

    const apiKey = this.configService.getOrThrow<string>('MAILCHIMP_TRANSACTIONAL_API_KEY');
    this.mailchimp = MailchimpTransactional(apiKey);

    this.fromEmail = this.configService.get<string>('MAIL_FROM') || 'noreply@vintage.com';
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

  // Generic Send Helper tailored for Mailchimp Transactional
  private async send(to: string, subject: string, html: string) {
    try {
      const response = await this.mailchimp.messages.send({
        message: {
          from_email: this.fromEmail,
          from_name: 'Vintage Beauty',
          subject: subject,
          html: html,
          text: html.replace(/<[^>]*>?/gm, ''), // Fallback plain text
          to: [
            {
              email: to,
              type: 'to'
            }
          ]
        }
      });

      // Mailchimp returns an array of status objects. 
      // We check if it was explicitly rejected or invalid to log it safely.
      if (response && response[0] && ['rejected', 'invalid'].includes(response[0].status)) {
        this.logger.error(`Mailchimp rejected email to ${to}. Reason: ${response[0].reject_reason}`);
      } else {
        this.logger.log(`Email sent successfully to ${to}: ${subject}`);
      }
    } catch (error: any) {
      // Safely catch API errors so the whole app doesn't crash if Mailchimp is down
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
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

  // D. Admin Alert for New Requests
  async sendNewRequestAlert(data: { firstName: string; lastName: string; email: string; phone: string; request: string }) {
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

  // E. Order Receipt
  async sendOrderReceipt(to: string, orderId: string, amount: string, items: any[]) {
    const itemList = items
      .map((i) => `<li style="margin-bottom: 8px;">${i.quantity}x <strong>${i.product?.title || 'Item'}</strong> <br/><span style="color: #666; font-size: 12px;">Variant: ${i.variantName || 'Standard'}</span></li>`)
      .join('');

    // 👇 FIX: Wrapped in the master template and actually returned the send function!
    const html = this.getTemplate(
      'Order Confirmed!',
      `
            <p>Thank you for your purchase from Vintage Beauty Care.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> ${orderId}</p>
                <p style="margin: 0;"><strong>Total Amount:</strong> ${amount}</p>
            </div>
            <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Items Ordered:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
                ${itemList}
            </ul>
            <p style="margin-top: 20px;">We will notify you as soon as your order ships!</p>
            `
    );

    return this.send(to, `Order Confirmation: #${orderId}`, html);
  }
}