import fs from 'fs';
import detectCharacterEncoding from 'detect-character-encoding';

const DCE_TO_NODE_ENCODINGS: Record<string, BufferEncoding> = {
  'UTF-16LE': 'utf16le',
  'UTF-8': 'utf8',
} as const;

export type TextFile = {
  encoding: BufferEncoding,
  content: string,
};

export default function readTextFileSync(path: string): TextFile {
  const fileContentsBuffer = fs.readFileSync(path);
  const dceEncoding = detectCharacterEncoding(fileContentsBuffer);
  if (dceEncoding === null) {
    throw new Error('failed to determine file encoding');
  }
  const nodeEncoding = DCE_TO_NODE_ENCODINGS[dceEncoding.encoding];
  if (nodeEncoding === undefined) {
    throw new Error(`unknown file encoding: ${dceEncoding.encoding}`);
  }
  const fileContentsString = fileContentsBuffer.toString(nodeEncoding);
  return {
    encoding: nodeEncoding,
    content: fileContentsString,
  };
}
