import fs from 'fs';
import { default as languageEncodingBrokenType, FileInfo } from 'detect-file-encoding-and-language';

const languageEncoding: (path: string) => Promise<FileInfo> = <any>languageEncodingBrokenType;

const DETECTED_TO_NODE_ENCODINGS: Record<string, BufferEncoding> = {
  'UTF-16LE': 'utf16le',
  'UTF-8': 'utf8',
} as const;

export type TextFile = {
  encoding: BufferEncoding,
  content: string,
};

export default async function readTextFile(path: string): Promise<TextFile> {
  const fileInfo = await languageEncoding(path);
  if (fileInfo.encoding === null) {
    throw new Error(`Failed to detect encoding of file: ${path}`);
  }
  const encoding = DETECTED_TO_NODE_ENCODINGS[fileInfo.encoding];
  if (encoding === null) {
    throw new Error(`Unknown encoding "${fileInfo.encoding}" of file: ${path}`);
  }
  const content = await fs.promises.readFile(path, { encoding });
  return { encoding, content };
}
