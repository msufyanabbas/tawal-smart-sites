import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = (process.env.EMAIL_HOST || '').trim();
    const isGmail =
      host.includes('gmail') ||
      (process.env.EMAIL_SERVICE || '').toLowerCase() === 'gmail';

    const user = (process.env.EMAIL || '').trim();
    // Strip spaces in case user pasted a 16-character Google App Password (e.g. "abcd efgh ijkl mnop")
    const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');

    if (isGmail) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      const port = Number(process.env.EMAIL_PORT) || 465;
      const secure = process.env.EMAIL_SECURE !== 'false' && port === 465;
      this.transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port,
        secure,
        auth: { user, pass },
      });
    }
  }

  onModuleInit() {
    const email = (process.env.EMAIL || '').trim();
    const pass = (process.env.EMAIL_PASSWORD || '').trim();

    if (!email || !pass) {
      this.logger.warn(
        'EMAIL or EMAIL_PASSWORD is missing in .env. Password reset emails cannot be sent.',
      );
      return;
    }

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(
          `SMTP connection verification failed: ${error.message}. ` +
            `If using Gmail, ensure 2-Step Verification is enabled and you are using a 16-character Google App Password (not your normal Google account password).`,
        );
      } else {
        this.logger.log('SMTP server is connected and ready to send emails.');
      }
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
    const fromEmail = (process.env.EMAIL || '').trim();
    const fromName = process.env.EMAIL_FROM_NAME || 'Tawal Sites';

    try {
      this.logger.log(`Sending password reset email to: ${toEmail}`);
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: 'Tawal Sites — Password Reset Request',
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
            <h2 style="color:#0f172a;margin-top:0;">Password Reset Request</h2>
            <p>Hi,</p>
            <p>We received a request to reset your Tawal Sites password.
               Click the button below to choose a new one. The link expires in 1 hour.</p>
            <p style="margin:24px 0;">
              <a href="${resetUrl}"
                 style="display:inline-block;padding:12px 24px;background:#1FB3E1;color:#fff;
                        text-decoration:none;border-radius:6px;font-weight:600;">
                Reset password
              </a>
            </p>
            <p style="color:#64748b;font-size:13px;">Or copy and paste this link into your browser:<br/>
              <a href="${resetUrl}" style="color:#1FB3E1;word-break:break-all;">${resetUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
            <p style="color:#94a3b8;font-size:12px;margin-bottom:0;">If you didn't request a reset, you can safely ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(
        `Password reset email sent successfully to ${toEmail}. MessageId: ${info.messageId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send password reset email to ${toEmail}: ${error?.message || error}`,
        error?.stack,
      );
      const isAuthError =
        error?.message?.includes('Invalid login') ||
        error?.message?.includes('Username and Password not accepted') ||
        error?.responseCode === 535;

      throw new InternalServerErrorException(
        isAuthError
          ? 'Email authentication failed: please ensure a valid Google App Password is set in the backend .env.'
          : 'Failed to send password reset email. Please check server SMTP configuration.',
      );
    }
  }
}
