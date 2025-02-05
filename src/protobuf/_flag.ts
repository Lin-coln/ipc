// 4bit - 0~16
export enum ProtocolFlag {
  /**
   * - [flag:0b0001, wireType: 4bit, data...]
   * - [flag:0b0001, empty: 0b0000, wireType: 1byte, data...]
   */
  WireType = 0x1,
}
