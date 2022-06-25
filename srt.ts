import * as timestamp from './timestamp';

export type SubtitleTextPart = {
  str: string,
  italic: boolean,
};

export type SubtitleText = {
  parts: SubtitleTextPart[],
};

export type SubtitlePeriod = {
  start: timestamp.Timestamp,
  end: timestamp.Timestamp,
};

export type Subtitle = {
  index: number,
  period: SubtitlePeriod,
  text: SubtitleText,
};

export function parseSrtTimestamp(srtTimestamp: string): timestamp.Timestamp {
  // an example srt timestamp is 01:52:45,517
  const partsStr = srtTimestamp.split(/[:,]/);
  if (partsStr.length !== 4) {
    throw new Error(`unexpected timestamp: ${srtTimestamp}`);
  }
  const hours = parseInt(partsStr[0]);
  const minutes = parseInt(partsStr[1]);
  const seconds = parseInt(partsStr[2]);
  const millis = parseInt(partsStr[3]);
  return timestamp.fromParts({ hours, minutes, seconds, millis });
}

export function parseSrtPeriod(srtPeriod: string): SubtitlePeriod {
  // an example srt period is 01:42:00,740 --> 01:42:05,621
  const partsStr = srtPeriod.split(/ *--> */);
  if (partsStr.length !== 2) {
    throw new Error(`unexpected period: ${srtPeriod}`);
  }
  const start = parseSrtTimestamp(partsStr[0]);
  const end = parseSrtTimestamp(partsStr[1]);
  return { start, end };
}

export function parseSrtSubtitle(srtSubtitle: string): Subtitle {
  // an example srt subtitle is:
  // 956
  // 01:43:12,436 --> 01:43:16,782
  // - <i>four, three, two, one.</i>
  // - <i>[Steady Beep]</i>
  const partsStr = srtSubtitle.split(/\r?\n/);
  if (partsStr.length < 2) {
    throw new Error(`unexpected subtitle: ${srtSubtitle}`);
  }
  const index = parseInt(partsStr[0]);
  const period = parseSrtPeriod(partsStr[1]);
  const str = partsStr.slice(2).join('\n');
  return {
    index,
    period,
    text: {
      parts: [
        { str, italic: false },
      ],
    },
  };
}

export function parseSrtString(srtString: string): Subtitle[] {
  return srtString.split(/\r?\n\r?\n/).map(parseSrtSubtitle);
}

export function prettyPrintSubtitlePeriod({ start, end }: SubtitlePeriod): string {
  return `${timestamp.prettyPrint(start)} --> ${timestamp.prettyPrint(end)}`;
}

export function prettyPrintSubtitleText({ parts }: SubtitleText): string {
  return parts.map(p => p.str).join('');
}

export function prettyPrintSubtitle({ index, period, text }: Subtitle): string {
  return `${index}\n${prettyPrintSubtitlePeriod(period)}\n${prettyPrintSubtitleText(text)}`;
}
