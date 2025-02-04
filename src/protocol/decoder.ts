import { WireType } from "./constants";

export class DecodeContext {
  parent: DecodeContext | null;
  type: WireType;
  buffer: Buffer;
  _offset: number;

  constructor(buffer: Buffer, offset: number = 0) {
    this.parent = null;
    this.type = null as any;
    this.buffer = buffer;
    this._offset = offset;
  }

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

  setType(type: WireType): this {
    this.type = type;
    return this;
  }

  sub(type?: WireType): DecodeContext {
    const ctx = new DecodeContext(this.buffer, this.offset);
    ctx.parent = this;
    if (type !== undefined) {
      return ctx.setType(type);
    }
    return ctx;
  }
}
