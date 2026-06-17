import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract raw text from a PDF.
 * @param data the PDF file as bytes
 * @returns the merged text of all pages plus the page count
 */
export async function extractPdfText(
  data: Uint8Array,
): Promise<{ text: string; totalPages: number }> {
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  // mergePages: true returns a single string, but normalize defensively.
  const merged = Array.isArray(text) ? text.join("\n") : (text ?? "");
  return { text: merged.trim(), totalPages };
}
