import { describe, expect, it, vi, beforeEach, Mock, afterAll } from "vitest";
import { IpcServerPlugin } from "../../src";
import path from "path";
import url from "node:url";
import net from "node:net";
import fs from "node:fs";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "../..");
const pipeFilename = path.join(projectDirname, "./scripts/pipe.sock");

describe("foo", () => {
  it("should ", () => {
    expect(1).toBe(1);
  });
});
