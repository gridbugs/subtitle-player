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

export function periodLengthMs(period: SubtitlePeriod): number {
  return period.end.totalMillis - period.start.totalMillis;
}

/** Looks up the subtitle whose period includes the given timestamp, assuming that
 *  subtitles is sorted cronologically by start time and contains no overlapping
 *  periods
 */
export function findSubtitleAtTime(subtitles: Subtitle[], time: timestamp.Timestamp): Subtitle | null {
  let lo = 0;
  let hi = subtitles.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const subtitle = subtitles[mid];
    if (subtitle.period.start.totalMillis > time.totalMillis) {
      hi = mid;
    } else if (subtitle.period.end.totalMillis <= time.totalMillis) {
      lo = mid + 1;
    } else {
      return subtitle;
    }
  }
  return null;
}

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

function parseSrtSubtitleText(subtitleTextString: string): SubtitleText {
  // an example subtitle text string is:
  // - Here's your <i>pen</i> back.
  // - <i>[Brett] What do we do now?</i>

  // in the example, tokens would be:
  // [ " - Here's your ", "<i>", "pen", "</i> back.\n - ", "<i>", [Brett] What do we do now?", "</i>" ]
  const tokens = subtitleTextString.split(/(<\/?i>)/).filter(s => s.length > 0);

  function isItalicOpen(s: string): boolean {
    return s === '<i>';
  }

  function isItalicClose(s: string): boolean {
    return s === '</i>';
  }

  const parts = [];
  let i = 0;
  while (i < tokens.length) {
    if (isItalicOpen(tokens[i])) {
      if (i + 1 === tokens.length) {
        throw new Error(`invalid subtitle: ${subtitleTextString}`);
      } else if (isItalicClose(tokens[i + 1])) {
        // empty italic block, just ignore the entire block
        i += 2;
      } else {
        const str = tokens[i + 1];
        if (i + 2 === tokens.length || !isItalicClose(tokens[i + 2])) {
          throw new Error(`invalid subtitle: ${subtitleTextString}`);
        }
        i += 3;
        parts.push({ str, italic: true });
      }
    } else {
      parts.push({ str: tokens[i], italic: false });
      i += 1;
    }
  }

  return { parts };
}

export function parseSrtSubtitle(srtSubtitle: string): Subtitle {
  // an example srt subtitle is:
  // 956
  // 01:43:12,436 --> 01:43:16,782
  // - <i>four, three, two, one.</i>
  // - <i>[Steady Beep]</i>
  const partsStr = srtSubtitle.split(/\r?\n/);
  if (partsStr.length < 2) {
    throw new Error(`unexpected subtitle: "${srtSubtitle}"`);
  }
  const index = parseInt(partsStr[0]);
  const period = parseSrtPeriod(partsStr[1]);
  const text = parseSrtSubtitleText(partsStr.slice(2).join('\n'));
  return {
    index,
    period,
    text,
  };
}

export function parseSrtString(srtString: string): Subtitle[] {
  const srtStringStripped = srtString.replace(/\r?\n$/g, '');
  return srtStringStripped.split(/\r?\n\r?\n/).map(parseSrtSubtitle);
}

export function prettyPrintSubtitlePeriod({ start, end }: SubtitlePeriod): string {
  return `${timestamp.prettyPrint(start)} --> ${timestamp.prettyPrint(end)}`;
}

export function htmlPrintSubtitleText({ parts }: SubtitleText): string {
  return parts.map((part) => {
    if (part.italic) {
      return `<em>${part.str}</em>`;
    } else {
      return part.str;
    }
  }).join('').replace('\n', '<br/>');
}

export function prettyPrintSubtitle({ index, period, text }: Subtitle): string {
  return `${index}\n${prettyPrintSubtitlePeriod(period)}\n${htmlPrintSubtitleText(text)}`;
}
