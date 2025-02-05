import { WireType, DecodeContext as IDecodeContext } from "../interfaces";

export class DecodeContext<Type extends WireType> {
  static for<Type extends WireType>(
    buffer: Buffer = Buffer.alloc(0),
    type?: Type,
  ): IDecodeContext<Type> {
    const ctx = new this(buffer);
    type && (ctx.wireType = type);
    return ctx as any;
  }

  static forSub<Type extends WireType>(
    parent: IDecodeContext<WireType>,
    type?: Type,
  ) {
    const ctx = this.for(parent.buffer, type);
    (ctx as unknown as DecodeContext<Type>).parent = parent;
    return ctx;
  }

  parent: IDecodeContext<WireType> | null;
  wireType: IDecodeContext<Type>["wireType"];
  buffer: Buffer;
  _offset: number;
  get offset() {
    if (this.parent) return this.parent.offset;
    return this._offset;
  }
  set offset(val) {
    if (this.parent) {
      this.parent.offset = val;
    } else {
      this._offset = val;
    }
  }
  constructor(buffer: Buffer) {
    this.parent = null;
    this.wireType = null as any;
    this.buffer = buffer;
    this._offset = 0;
  }
}
