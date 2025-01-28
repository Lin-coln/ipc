import { describe, it, expect } from "vitest";
import { encode, decode } from "../../src/protocol/sint64";

describe("sint64 encode/decode", () => {
  it("should encode and decode zero correctly", () => {
    const value = 0n;
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should encode and decode positive numbers correctly", () => {
    const value = 12345n;
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should encode and decode negative numbers correctly", () => {
    const value = -12345n;
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should encode and decode large positive numbers correctly", () => {
    const value = 2n ** 62n - 1n; // Maximum positive sint64
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should encode and decode large negative numbers correctly", () => {
    const value = -(2n ** 62n); // Minimum negative sint64
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should encode and decode number type input correctly", () => {
    const value = 42; // Passing a number instead of bigint
    const encoded = encode(value);
    const decoded = decode(encoded);
    expect(decoded).toBe(BigInt(value));
  });

  it("should handle single-byte encoding correctly", () => {
    const value = 64n - 1n; // A value small enough to fit in one byte
    const encoded = encode(value);
    expect(encoded.length).toBe(1); // Single byte
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should handle multi-byte encoding correctly", () => {
    const value = 64n; // A value requiring two bytes
    const encoded = encode(value);
    expect(encoded.length).toBeGreaterThan(1); // Multi-byte
    const decoded = decode(encoded);
    expect(decoded).toBe(value);
  });

  it("should throw an error for empty buffer in decode", () => {
    const buffer = Buffer.from([]);
    expect(() => decode(buffer)).toThrowError();
  });
});
