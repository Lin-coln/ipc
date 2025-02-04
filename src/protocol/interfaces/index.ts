export type { SupportedType, WireType } from "../constants";
import { WireType } from "../constants";

export interface TypeArrParams {
  type: WireType;
  nested?: object;
}
