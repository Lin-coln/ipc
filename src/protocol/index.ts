import type { SupportedType } from "./interfaces";

import {
  resolveWireTypeFromSupportedValue,
  encodeContent,
  decodeContent,
} from "./resolver";

const ls: SupportedType[] = [
  -1,
  0,
  1,
  3.14,
  -3.14,
  Buffer.from([0x21, 0x23, 0xa4]),
  "hello world",
  true,
  false,
  new Set([1, 2, 3, "asdf", true, -324324]),
  new Map<any, any>([
    ["foo", true],
    ["bar", "adsfasdfads"],
    ["foobar", 213213.122],
  ]),
];

ls.forEach((item) => {
  const type = resolveWireTypeFromSupportedValue(item);
  const encoded = encodeContent(item, type);
  const decoded = decodeContent(encoded, 0, type);
  console.log(`val:`, item, decoded.value);
  // console.log(encoded);
  console.log(toBinStr(encoded));
});

function toBinStr(bufferOrNum: Buffer | number): string {
  let buffer: Buffer;
  if (typeof bufferOrNum === "number") {
    buffer = toBuffer(bufferOrNum);
  } else {
    buffer = bufferOrNum;
  }
  return Array.from(buffer)
    .map((byte) => byte.toString(2).padStart(8, "0"))
    .join("_");
}

function toBuffer(num: number) {
  const len = getByteLen(num);
  const buffer = Buffer.alloc(len);
  buffer.writeUIntBE(num, 0, len);
  return buffer;
}

function getByteLen(num: number): number {
  return Math.ceil(getBitLen(num) / 8);
}

function getBitLen(num: number): number {
  return Math.floor(Math.log2(num)) + 1;
}
