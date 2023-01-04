import fs from 'fs';
import { default as languageEncodingBrokenType, FileInfo } from 'detect-file-encoding-and-language';
import { default as iconvLite } from 'iconv-lite';

const languageEncoding: (path: string) => Promise<FileInfo> = <any>languageEncodingBrokenType;

function decodeBuffer(buffer: Buffer, encodingFromDetectFileEncodingAndLanguage: string): string {
  switch (encodingFromDetectFileEncodingAndLanguage) {
    case 'UTF-8': return buffer.toString('utf8');
    case 'UTF-16LE': return buffer.toString('utf16le');
    case 'CP1252': return iconvLite.decode(buffer, 'win1251');
    default: throw new Error(`Don't know how ta handle encoding: ${encodingFromDetectFileEncodingAndLanguage}`);
  }
}

export default async function readTextFile(path: string): Promise<string> {
  const fileInfo = await languageEncoding(path);
  if (fileInfo.encoding === null) {
    throw new Error(`Failed to detect encoding of file: ${path}`);
  }
  console.log(`Reading subtitles from text file: ${path}`);
  console.log(`File encoding: ${fileInfo.encoding}`);
  const buffer = await fs.promises.readFile(path);
  return decodeBuffer(buffer, fileInfo.encoding);
}
