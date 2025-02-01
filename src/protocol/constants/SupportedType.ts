export type SupportedType =
  | boolean
  | number
  | bigint
  | string
  // bytes
  | ArrayBuffer
  | Buffer
  // arr
  | Set<SupportedType>
  | Array<SupportedType>
  // map
  | Map<SupportedType, SupportedType>
  | JsonObject;
interface JsonObject {
  [key: number | string]: SupportedType;
}
