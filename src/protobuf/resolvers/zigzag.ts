export const zigzag = {
  encode(value: bigint): bigint {
    let val = value << 1n;
    if (value < 0) val = ~val;
    return val;
  },
  decode(value: bigint): bigint {
    let decoded = value >> 1n;
    if ((value & 1n) === 1n) {
      decoded = ~decoded;
    }
    return decoded;
  },
};
