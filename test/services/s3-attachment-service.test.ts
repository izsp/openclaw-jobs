import { describe, it, expect, vi, beforeEach } from "vitest";

// Set env before import
process.env.S3_ATTACHMENTS_BUCKET = "test-bucket";
process.env.AWS_REGION = "ap-southeast-1";

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client { send = mockSend; }
  class Cmd { input: unknown; constructor(input: unknown) { this.input = input; } }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: class extends Cmd {},
    GetObjectCommand: class extends Cmd {},
    HeadObjectCommand: class extends Cmd {},
    DeleteObjectsCommand: class extends Cmd {},
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

// Dynamic import to work around singleton — re-import after mocks are set up
const {
  generateUploadUrl,
  generateDownloadUrl,
  headAttachment,
  deleteAttachments,
// eslint-disable-next-line @typescript-eslint/no-require-imports
} = await import("@/lib/services/s3-attachment-service");

describe("s3-attachment-service", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
  });

  describe("generateUploadUrl", () => {
    it("should return correct s3Key format with extension", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example.com/signed");

      const result = await generateUploadUrl(
        "task_abc123",
        "file_001",
        "photo.png",
        "image/png",
        1024,
      );

      expect(result.s3Key).toBe("tasks/task_abc123/file_001.png");
      expect(result.uploadUrl).toBe("https://s3.example.com/signed");
    });

    it("should handle filenames without extension", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example.com/signed");

      const result = await generateUploadUrl(
        "task_abc",
        "file_002",
        "README",
        "text/plain",
        100,
      );

      expect(result.s3Key).toBe("tasks/task_abc/file_002");
    });

    it("should pass correct expiry to presigner", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example.com/signed");

      await generateUploadUrl("task_abc", "f1", "file.txt", "text/plain", 100);

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 },
      );
    });
  });

  describe("generateDownloadUrl", () => {
    it("should return presigned URL with download content disposition", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example.com/download");

      const url = await generateDownloadUrl(
        "tasks/task_abc/file.pdf",
        "My Report.pdf",
      );

      expect(url).toBe("https://s3.example.com/download");
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("should pass 1-hour expiry for downloads", async () => {
      mockGetSignedUrl.mockResolvedValue("https://s3.example.com/download");

      await generateDownloadUrl("tasks/task_abc/file.pdf", "file.pdf");

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });
  });

  describe("headAttachment", () => {
    it("should return content type and size for existing object", async () => {
      mockSend.mockResolvedValue({
        ContentType: "application/pdf",
        ContentLength: 2048,
      });

      const result = await headAttachment("tasks/task_abc/file.pdf");

      expect(result.contentType).toBe("application/pdf");
      expect(result.size).toBe(2048);
    });

    it("should throw for non-existent object", async () => {
      mockSend.mockRejectedValue(new Error("NotFound"));

      await expect(headAttachment("tasks/task_abc/missing.pdf")).rejects.toThrow();
    });

    it("should default content type to application/octet-stream", async () => {
      mockSend.mockResolvedValue({
        ContentType: undefined,
        ContentLength: 100,
      });

      const result = await headAttachment("tasks/task_abc/file.bin");
      expect(result.contentType).toBe("application/octet-stream");
    });
  });

  describe("deleteAttachments", () => {
    it("should not call S3 for empty array", async () => {
      await deleteAttachments([]);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should send DeleteObjects for non-empty array", async () => {
      mockSend.mockResolvedValue({});

      await deleteAttachments([
        "tasks/task_abc/file1.pdf",
        "tasks/task_abc/file2.png",
      ]);

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
