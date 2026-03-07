import { describe, it, expect } from "vitest";
import {
  uploadUrlSchema,
  attachmentSchema,
  attachmentsArraySchema,
  sanitizeFilename,
} from "@/lib/validators/attachment.validator";

describe("sanitizeFilename", () => {
  it("should strip path traversal sequences", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("______etc_passwd");
  });

  it("should strip forward/backward slashes", () => {
    expect(sanitizeFilename("path/to\\file.txt")).toBe("path_to_file.txt");
  });

  it("should strip control characters", () => {
    expect(sanitizeFilename("file\x00name\x1f.txt")).toBe("filename.txt");
  });

  it("should truncate names longer than 255 chars", () => {
    const longName = "a".repeat(300) + ".txt";
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
  });

  it("should preserve normal filenames", () => {
    expect(sanitizeFilename("report-2026.pdf")).toBe("report-2026.pdf");
  });
});

describe("uploadUrlSchema", () => {
  const valid = {
    task_id: "task_abc123",
    filename: "report.pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
  };

  it("should accept valid input", () => {
    const result = uploadUrlSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject missing task_id prefix", () => {
    const result = uploadUrlSchema.safeParse({ ...valid, task_id: "abc123" });
    expect(result.success).toBe(false);
  });

  it("should reject disallowed MIME types", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      content_type: "application/x-executable",
    });
    expect(result.success).toBe(false);
  });

  it("should accept image/* types", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      content_type: "image/png",
    });
    expect(result.success).toBe(true);
  });

  it("should accept text/* types", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      content_type: "text/csv",
    });
    expect(result.success).toBe(true);
  });

  it("should accept video/mp4", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      content_type: "video/mp4",
    });
    expect(result.success).toBe(true);
  });

  it("should reject files over 100 MB", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      size_bytes: 200 * 1024 * 1024,
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero-byte files", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      size_bytes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should sanitize filename with path traversal", () => {
    const result = uploadUrlSchema.safeParse({
      ...valid,
      filename: "../../../etc/passwd",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filename).not.toContain("..");
      expect(result.data.filename).not.toContain("/");
    }
  });
});

describe("attachmentSchema", () => {
  const valid = {
    s3_key: "tasks/task_abc123/xyz789.pdf",
    filename: "report.pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
  };

  it("should accept valid attachment", () => {
    const result = attachmentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid s3_key format", () => {
    const result = attachmentSchema.safeParse({
      ...valid,
      s3_key: "invalid/path",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty filename", () => {
    const result = attachmentSchema.safeParse({
      ...valid,
      filename: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("attachmentsArraySchema", () => {
  const validAttachment = {
    s3_key: "tasks/task_abc123/xyz789.pdf",
    filename: "report.pdf",
    content_type: "application/pdf",
    size_bytes: 1024,
  };

  it("should accept empty array", () => {
    const result = attachmentsArraySchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("should accept array of valid attachments", () => {
    const result = attachmentsArraySchema.safeParse([validAttachment]);
    expect(result.success).toBe(true);
  });

  it("should reject more than 10 attachments", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      ...validAttachment,
      s3_key: `tasks/task_abc123/file${i}.pdf`,
    }));
    const result = attachmentsArraySchema.safeParse(many);
    expect(result.success).toBe(false);
  });
});
