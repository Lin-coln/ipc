export enum WireType {
  // basic
  Custom = 0x0, // ext: (ext << 8) | 0x0
  Boolean = 0x1, // 0x0 - false & 0x1 - true
  VarInt = 0x2, // varint
  SVarInt = 0x3, // varint & zigzag
  VarFloat = 0x4, // [exp:varint, integer:varint]
  SVarFloat = 0x5, // [exp:varint, integer:svarint]
  String = 0x6, // [len:varint, data:utf8]
  Bytes = 0x7, // [len:varint, data:binary]
  Array = 0x8, // [len:varint, values:[type, value]]
  Map = 0x9, // [size:varint, entries:[[type, key], [type, value]]

  // advanced
  TypeArray = 0xa, // [size:varint, type, values]
  // TypeMap = 0xb, // [size:varint, key_type, val_type, entries]

  // // custom
  // Foo = (0x1 << 8) | 0x0,
}
