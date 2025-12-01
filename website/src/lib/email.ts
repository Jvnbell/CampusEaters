import { Resend } from 'resend';
import type { OrderStatus } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

type OrderStatusEmailData = {
  userEmail: string;
  userName: string;
  orderNumber: number;
  status: OrderStatus;
  restaurantName: string;
  deliveryLocation: string;
};

const statusMessages: Record<OrderStatus, { subject: string; message: string }> = {
  SENT: {
    subject: 'Order Confirmed - CampusEaters',
    message: 'Your order has been confirmed and sent to the restaurant.',
  },
  RECEIVED: {
    subject: 'Order Received - CampusEaters',
    message: 'The restaurant has received your order and is preparing it.',
  },
  SHIPPING: {
    subject: 'Order Out for Delivery - CampusEaters',
    message: 'Your order is on its way! Our delivery robot is bringing it to you.',
  },
  DELIVERED: {
    subject: 'Order Delivered - CampusEaters',
    message: 'Your order has been delivered! Enjoy your meal.',
  },
};

export async function sendOrderStatusEmail(data: OrderStatusEmailData): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email notification skipped.');
    return;
  }

  const statusInfo = statusMessages[data.status];
  const statusLabel = data.status.charAt(0) + data.status.slice(1).toLowerCase();

  try {
    await resend.emails.send({
      from: 'CampusEaters <onboarding@resend.dev>',
      to: data.userEmail,
      subject: statusInfo.subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Status Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
              <h1 style="color: #2563eb; margin-top: 0;">CampusEaters</h1>
              
              <h2 style="color: #1f2937; margin-top: 30px;">Order Status Update</h2>
              
              <p>Hello ${data.userName},</p>
              
              <p>${statusInfo.message}</p>
              
              <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0;"><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p style="margin: 10px 0 0 0;"><strong>Status:</strong> ${statusLabel}</p>
                <p style="margin: 10px 0 0 0;"><strong>Restaurant:</strong> ${data.restaurantName}</p>
                <p style="margin: 10px 0 0 0;"><strong>Delivery Location:</strong> ${data.deliveryLocation}</p>
              </div>
              
              <p style="margin-top: 30px;">
                You can track your order status at any time by visiting our website.
              </p>
              
              <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
                If you have any questions, please contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
        CampusEaters - Order Status Update
        
        Hello ${data.userName},
        
        ${statusInfo.message}
        
        Order Number: #${data.orderNumber}
        Status: ${statusLabel}
        Restaurant: ${data.restaurantName}
        Delivery Location: ${data.deliveryLocation}
        
        You can track your order status at any time by visiting our website.
        
        If you have any questions, please contact our support team.
        
        ---
        This is an automated email. Please do not reply to this message.
      `,
    });
  } catch (error) {
    console.error('Failed to send order status email:', error);
    // Don't throw - we don't want email failures to break order updates
  }
}

