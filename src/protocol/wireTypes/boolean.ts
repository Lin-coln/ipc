import type { WireResolver } from "../interfaces";

export const boolean: WireResolver<boolean> = {
  encode(val: boolean) {
    const buf = Buffer.alloc(1);
    buf.writeUIntBE(val ? 0x1 : 0x0, 0, 1);
    return buf;
  },
  decode(buf: Buffer, ofs: number) {
    return {
      value: buf.readUInt8(ofs) === 0x01,
      offset: ofs + 1,
    };
  },
};
