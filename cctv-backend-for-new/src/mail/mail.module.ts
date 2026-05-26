import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// MailService talks to SMTP directly via nodemailer (see mail.service.ts), so
// we don't wire up @nestjs-modules/mailer here.
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
