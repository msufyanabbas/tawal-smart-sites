import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

import { TokenDocument } from './token.schema';
import { UserDocument } from '../user/user.schema';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel('Token') private readonly tokenModel: Model<TokenDocument>,
  ) {}

  // Generate a reset token and save it in the database with an expiration time
  async saveResetToken(userId: string): Promise<string> {
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry

    const token = new this.tokenModel({
      userId,
      token: resetToken,
      expires: resetTokenExpires,
    });

    await token.save();

    return resetToken;
  }

  // Find and validate the reset token
  async findTokenData(token: string) {
    const tokenData = await this.tokenModel.findOne({ token }).exec();
    if (!tokenData || new Date() > tokenData.expires) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    return tokenData;
  }

  // Invalidate the token after it has been used or expired
  async invalidateToken(token: string) {
    const tokenData = await this.tokenModel.findOneAndDelete({ token }).exec();
    if (!tokenData) {
      throw new NotFoundException('Token not found');
    }
  }
}
