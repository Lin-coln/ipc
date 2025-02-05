import {
  EncodeContext as IEncodeContext,
  SupportedType,
  WireType,
  WireTypeOf,
} from "../interfaces";
import { parseWireTypeFromSupportedValue } from "./parseWireTypeFromSupportedValue";

export class EncodeContext<Type extends WireType> {
  static for<T extends SupportedType>(value: T): IEncodeContext<WireTypeOf<T>> {
    const type = parseWireTypeFromSupportedValue(value);
    const ctx = new this();
    ctx.wireType = type;
    return ctx as any;
  }
  static forType<Type extends WireType>(
    type: Type,
    params: Type extends WireType.TypeArray
      ? IEncodeContext<Type>["params"]
      : never,
  ): IEncodeContext<Type> {
    const ctx = new this();
    ctx.wireType = type;
    params && (ctx.params = params);
    return ctx as any;
  }

  static forSub<T extends SupportedType>(
    ctx: IEncodeContext<WireType>,
    value: T,
  ): IEncodeContext<WireTypeOf<T>> {
    return this.for(value);
  }

  static forSubType<Type extends WireType>(
    ctx: IEncodeContext<WireType>,
    type: Type,
    params: Type extends WireType.TypeArray
      ? IEncodeContext<Type>["params"]
      : never,
  ): IEncodeContext<Type> {
    return this.forType(type, params);
  }

  wireType: IEncodeContext<Type>["wireType"];
  params: Type extends WireType.TypeArray
    ? IEncodeContext<Type>["params"]
    : null;
  constructor() {
    this.wireType = null as any;
    this.params = null as any;
  }
}
