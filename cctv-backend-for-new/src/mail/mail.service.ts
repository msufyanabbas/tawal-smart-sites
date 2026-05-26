import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Build the reset URL pointing at the web SPA's /change-password route.
  // Accepts FRONTEND_URL (preferred) and falls back to legacy CLIENT_URL.
  private buildResetUrl(token: string): string {
    const raw = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
    const base = raw.replace(/\/+$/, '');
    if (!base) {
      this.logger.warn(
        'FRONTEND_URL (or CLIENT_URL) is not set — reset link will be relative.',
      );
    }
    return `${base}/change-password?token=${encodeURIComponent(token)}`;
  }

  async sendPasswordResetEmail(toEmail: string, token: string) {
    const resetUrl = this.buildResetUrl(token);
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL,
        to: toEmail,
        subject: 'Tawal Sites — Password Reset Request',
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;">
            <p>Hi,</p>
            <p>We received a request to reset your Tawal Sites password.
               Click the button below to choose a new one. The link expires in 1 hour.</p>
            <p>
              <a href="${resetUrl}"
                 style="display:inline-block;padding:10px 16px;background:#1FB3E1;color:#fff;
                        text-decoration:none;border-radius:6px;font-weight:600;">
                Reset password
              </a>
            </p>
            <p>Or paste this link into your browser:<br/>
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            <p>If you didn't request a reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Error sending password reset email', error as Error);
      throw new InternalServerErrorException(
        'Failed to send password reset email.',
      );
    }
  }
}
