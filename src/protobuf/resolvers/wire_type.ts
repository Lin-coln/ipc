import { WireType } from "../interfaces";

export const wire_type = {
  encode(type: WireType): Buffer {
    return Buffer.from([type]);
  },
  decode<T extends WireType>(ctx: { buffer: Buffer; offset: number }): T {
    return ctx.buffer[ctx.offset++] as T;
  },
};
