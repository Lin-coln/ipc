import { describe, it, expect } from "vitest";
import { encode, decode } from "../../src/protocol/double";

describe("Double encode and decode tests", () => {
  it("should encode and decode a positive number correctly", () => {
    const value = 123.456;
    const encoded = encode(value);
    const decoded = decode(encoded);

    expect(decoded).toBe(value);
  });

  it("should encode and decode a negative number correctly", () => {
    const value = -123.456;
    const encoded = encode(value);
    const decoded = decode(encoded);

    expect(decoded).toBe(value);
  });

  it("should throw an error for an invalid buffer length", () => {
    const invalidBuffer = Buffer.alloc(4); // Buffer should be 8 bytes, 4 bytes is invalid
    expect(() => decode(invalidBuffer)).toThrowError(
      "Invalid buffer length, expected 8 bytes for double",
    );
  });

  it("should handle zero correctly", () => {
    const value = 0;
    const encoded = encode(value);
    const decoded = decode(encoded);

    expect(decoded).toBe(value);
  });

  it("should handle very large numbers correctly", () => {
    const value = 1.79e308; // Max value for double precision
    const encoded = encode(value);
    const decoded = decode(encoded);

    expect(decoded).toBe(value);
  });

  it("should handle very small numbers correctly", () => {
    const value = 5e-324; // Smallest positive number in double precision
    const encoded = encode(value);
    const decoded = decode(encoded);

    expect(decoded).toBe(value);
  });
});
