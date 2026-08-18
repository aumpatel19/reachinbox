import type { Attachment } from "@/types/api";

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 11 * 1024 * 1024;

export function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      resolve({ filename: file.name, contentType: file.type || "application/octet-stream", content: base64 });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
