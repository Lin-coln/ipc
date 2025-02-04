import { SupportedType } from "./interfaces";
import { WireType } from "./constants";

import { EncodeContext } from "./encoder";
import { DecodeContext } from "./decoder";
import { EncodeUtils } from "./constants/EncodeUtils";
import { DecodeUtils } from "./constants/DecodeUtils";

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
  [13, 23, 2.23, "adf", 3n, false, { fo: 3224 }, [], {}],
  {
    fff: [],
    sd: {},
    foo: 123,
    shit: [123, 2],
    bar: "12312",
    foobar: {
      zoo: 123,
      fooo: true,
      barrr: 3.212,
    },
  },
  [
    "type_set",
    "foo",
    "bar",
    "foobar1",
    "foobar2",
    "foobar3",
    "foobar4",
    "foobar5",
    "foobar6",
    "foobar7",
    "foobar8",
    "foobar9",
    "foobar00",
  ],
];

ls.forEach((item) => {
  execute(item);
  console.log("");
});

// execute(new Set([1, 2, 3, "asdf", true, -324324]));

function execute(item: SupportedType) {
  console.log(`origin:`, item);
  const isTypeArr = Array.isArray(item) && item[0] === "type_set";
  // const isTypeArr = true;
  const encodeCtx = isTypeArr
    ? new EncodeContext().setType(WireType.TypeArray, {
        type: WireType.String,
      })
    : new EncodeContext(item);

  const type = EncodeUtils.encodeType(encodeCtx.type!);
  const body = EncodeUtils.encodeBody(encodeCtx, item);
  console.log(`len: ${body.length}`);
  console.log("type:", toBinStr(type));
  console.log("body:", toBinStr(body));

  const decodeCtx = new DecodeContext(body).setType(encodeCtx.type);
  const decoded = DecodeUtils.decodeBody(decodeCtx);
  console.log(`decoded:`, decoded);
}

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
