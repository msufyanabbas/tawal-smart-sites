import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SerialService } from './serial.service';
import { SerialController } from './serial.controller';
import { SimSerial, SimSerialSchema, RmsSerial, RmsSerialSchema, SmartLockSerial, SmartLockSerialSchema } from './serial.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SimSerial.name, schema: SimSerialSchema },
      { name: RmsSerial.name, schema: RmsSerialSchema },
      { name: SmartLockSerial.name, schema: SmartLockSerialSchema },
    ]),
  ],
  controllers: [SerialController],
  providers: [SerialService],
  exports: [SerialService],
})
export class SerialModule {}
