import * as socketIoClient from 'socket.io-client';
import * as page from './page';
import * as srt from '../common/srt';
import * as timestamp from '../common/timestamp';

function subtitleTextToShowAtTime(subtitles: srt.Subtitle[], ts: timestamp.Timestamp): string {
  const prettyTime = timestamp.prettyPrint(ts);
  const prefix = `${prettyTime}<br/>`;
  const subtitle = srt.findSubtitleAtTime(subtitles, ts);
  if (subtitle === null) {
    return prefix;
  } else {
    return `${prefix}${srt.htmlPrintSubtitleText(subtitle.text)}`;
  }
}


const MS_TO_PX_MULT = 0.02;

function subtitleToHtml(subtitle: srt.Subtitle): string {
  const periodMs = srt.periodLengthMs(subtitle.period);
  const startMs = subtitle.period.start.totalMillis;
  const heightPx = Math.floor(periodMs * MS_TO_PX_MULT);
  const topPx = Math.floor(startMs * MS_TO_PX_MULT);
  return `<div class='subtitle' style='top: ${topPx}px; height: ${heightPx}px'>
  ${srt.htmlPrintSubtitleText(subtitle.text)}
</div>`;
}

function mkTimeMarker(timeMs: number): string {
  const topPx = Math.floor(timeMs * MS_TO_PX_MULT);
  const timeMarkerText = timestamp.prettyPrint(timestamp.fromMillis(timeMs));
  return `<div class='time-marker' style='top: ${topPx}px'>
  ${timeMarkerText}
</div>`;
}

function mkTimeMarkersHtml(endTime: timestamp.Timestamp): string {
  const period = timestamp.fromParts({ hours: 0, minutes: 0, seconds: 10, millis: 0 }).totalMillis;
  const endMs = endTime.totalMillis;
  const timesMs: number[] = [0];
  while (timesMs[timesMs.length - 1] < endMs) {
    timesMs.push(timesMs[timesMs.length - 1] + period);
  }
  return timesMs.map(mkTimeMarker).join('\n');
}

function mkCursor(): string {
  return `<div id='cursor'></div>`;
}

function setCursorPosition(time: timestamp.Timestamp): void {
  const topPx = Math.floor(time.totalMillis * MS_TO_PX_MULT);
  page.getElement('cursor').style.top = `${topPx}px`;
}

function run() {
  const displayElement = page.getSubtitlesDisplayElement();
  const subtitles = page.getSubtitles();
  const subtitlesHtml = subtitles.map(subtitleToHtml).join('\n');
  const timeMarkersHtml = mkTimeMarkersHtml(subtitles[subtitles.length - 1].period.end);
  console.log(timeMarkersHtml);
  page.getElement('subtitles-seek').innerHTML = subtitlesHtml + timeMarkersHtml + mkCursor();
  const io = socketIoClient.io();
  io.on('SetTime', (timeMs) => {
    const ts = timestamp.fromMillis(timeMs);
    displayElement.innerHTML = subtitleTextToShowAtTime(subtitles, ts);
    setCursorPosition(ts);
  });
  page.getElement('play').onclick = () => {
    io.emit('Play');
  };
  page.getElement('pause').onclick = () => {
    io.emit('Pause');
  };
}

run();
