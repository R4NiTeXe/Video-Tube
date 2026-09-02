import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import fs from "fs";
import path from "path";
import os from "os";
import { validateMagicBytes } from "../src/middlewares/multer.middleware.js";

describe("Video magic-byte validation", () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "magic-"));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeFile = (name, bytes) => {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, Buffer.from(bytes));
    return p;
  };

  it("rejects fake payload beginning 00 00 00 for video/mp4", () => {
    const p = writeFile("fake.mp4", [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(p, "video/mp4")).toBe(false);
  });

  it("rejects executable masquerading as mp4 (00 00 00 + random)", () => {
    const p = writeFile("evil.mp4", [0x00, 0x00, 0x00, 0x18, 0x4d, 0x5a, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00]); // MZ header at 4
    expect(validateMagicBytes(p, "video/mp4")).toBe(false);
  });

  it("accepts valid MP4 with ftyp at offset 4", () => {
    const p = writeFile("valid.mp4", [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    expect(validateMagicBytes(p, "video/mp4")).toBe(true);
  });

  it("accepts valid QuickTime with ftyp", () => {
    const p = writeFile("valid.mov", [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
    expect(validateMagicBytes(p, "video/quicktime")).toBe(true);
  });

  it("rejects fake quicktime without ftyp", () => {
    const p = writeFile("fake.mov", [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(p, "video/quicktime")).toBe(false);
  });

  it("accepts valid webm", () => {
    const p = writeFile("valid.webm", [0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(p, "video/webm")).toBe(true);
  });

  it("rejects webm with wrong header", () => {
    const p = writeFile("fake.webm", [0x00, 0x00, 0x00, 0x00]);
    expect(validateMagicBytes(p, "video/webm")).toBe(false);
  });

  it("accepts valid jpeg", () => {
    const p = writeFile("valid.jpg", [0xff, 0xd8, 0xff, 0xe0]);
    expect(validateMagicBytes(p, "image/jpeg")).toBe(true);
  });
});
