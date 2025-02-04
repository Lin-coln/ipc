import { SupportedType, WireType } from "./constants";
import { EncodeUtils } from "./constants/EncodeUtils";

export class EncodeContext {
  type: WireType;
  params: any;
  constructor(value?: SupportedType) {
    this.type =
      value !== undefined
        ? EncodeUtils.parseWireTypeFromSupportedValue(value)
        : (null as any);
    this.params = null;
  }
  setType(type: WireType, params?: any): this {
    this.type = type;
    if (params) {
      return this.setParams(params);
    }
    return this;
  }
  setParams(params: any): this {
    this.params = params;
    return this;
  }
}
