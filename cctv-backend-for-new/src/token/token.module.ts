import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { UserModule } from '../user/user.module'; // If needed
import { Token, TokenSchema } from './token.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]), UserModule],
  providers: [TokenService],
  exports: [TokenService], // ✅ Export it so others can use
})
export class TokenModule {}
