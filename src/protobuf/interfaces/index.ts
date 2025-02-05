export { WireType } from "./wire_type";
export type * from "./supported";

// context
import { WireType } from "./wire_type";
import { SupportedTypeOf } from "./supported";

interface TypeArrayParams<Type extends WireType> {
  elType: Type;
  nested: Type extends WireType.TypeArray
    ? TypeArrayParams<WireType>
    : undefined;
}
type WireTypeToEncodeContext = {
  [K in WireType]: K extends WireType.TypeArray
    ? { params: TypeArrayParams<WireType> }
    : {};
};

type WireTypeToDecodeContext = {
  [K in WireType]: K extends WireType.TypeArray ? {} : {};
};

export type EncodeContext<Type extends WireType> =
  WireTypeToEncodeContext[Type] & {
    wireType: Type;
  };

export type DecodeContext<Type extends WireType> =
  WireTypeToDecodeContext[Type] & {
    wireType: Type;
    // parent: DecodeContext<WireType> | null;
    buffer: Buffer;
    offset: number;
  };
