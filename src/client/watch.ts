import * as socketIoClient from 'socket.io-client';
import * as page from './page';
import * as srt from '../common/srt';
import * as timestamp from '../common/timestamp';

function subtitleTextToShowAtTime(subtitles: srt.Subtitle[], ts: timestamp.Timestamp, debug: boolean): string {
  let prefix: string;
  if (debug) {
    const prettyTime = timestamp.prettyPrint(ts);
    prefix = `${prettyTime}<br/>`;
  } else {
    prefix = '';
  }
  const subtitle = srt.findSubtitleAtTime(subtitles, ts);
  if (subtitle === null) {
    return prefix;
  } else {
    return `${prefix}${srt.htmlPrintSubtitleText(subtitle.text)}`;
  }
}

function run() {
  const displayElement = page.getSubtitlesDisplayElement();
  const subtitles = page.getSubtitles();
  const io = socketIoClient.io();
  io.on('SetTime', (timeMs) => {
    const ts = timestamp.fromMillis(timeMs);
    displayElement.innerHTML = subtitleTextToShowAtTime(subtitles, ts, page.isDebug());
  });
}

run();
