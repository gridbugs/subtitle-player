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


const MS_TO_PX_MULT = 0.05;
const MARKER_PERIOD_MS = timestamp.fromParts({ hours: 0, minutes: 0, seconds: 10, millis: 0 }).totalMillis;

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
  const heightPx = Math.floor(MARKER_PERIOD_MS * MS_TO_PX_MULT);
  const timeMarkerText = timestamp.prettyPrint(timestamp.fromMillis(timeMs));
  return `<div class='time-marker' style='top: ${topPx}px; height: ${heightPx}px;' data-time-ms='${timeMs}'>
  ${timeMarkerText}
</div>`;
}

function mkTimeMarkersHtml(endTime: timestamp.Timestamp): string {
  const endMs = endTime.totalMillis;
  const timesMs: number[] = [0];
  while (timesMs[timesMs.length - 1] < endMs) {
    timesMs.push(timesMs[timesMs.length - 1] + MARKER_PERIOD_MS);
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
  page.getElement('subtitles-seek').innerHTML = subtitlesHtml + timeMarkersHtml + mkCursor();
  document.querySelectorAll('.time-marker').forEach((element) => {
    if (element instanceof HTMLElement) {
      const timeMsString = element.getAttribute('data-time-ms');
      if (timeMsString !== null) {
        const timeMs = parseInt(timeMsString);
        element.onclick = (e: MouseEvent) => {
          const yWithinMarkerPx = e.offsetY;
          const timeMsWithinMarker = yWithinMarkerPx / MS_TO_PX_MULT;
          const clickTimeMs = timeMs + timeMsWithinMarker;
          io.emit('Seek', clickTimeMs);
        }
      }
    }
  });
  let speedScale = 1;
  function updateSpeedScaleDisplay() {
    const e = page.getElement('speed-scale-display');
    e.innerHTML = speedScale.toString();
  }
  updateSpeedScaleDisplay();
  const speedScaleStep = 0.01;
  let currentTimeMs = 0;
  const io = socketIoClient.io();
  io.on('SetTime', (timeMs) => {
    currentTimeMs = timeMs;
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
  page.getElement('scroll-to-cursor').onclick = () => {
    page.getElement('cursor').scrollIntoView();
  };
  page.getElement('+1s').onclick = () => {
    io.emit('Seek', currentTimeMs + 1000);
  };
  page.getElement('-1s').onclick = () => {
    io.emit('Seek', currentTimeMs - 1000);
  };
  page.getElement('+0.1s').onclick = () => {
    io.emit('Seek', currentTimeMs + 100);
  };
  page.getElement('-0.1s').onclick = () => {
    io.emit('Seek', currentTimeMs - 100);
  };
  page.getElement('faster').onclick = () => {
    speedScale += speedScaleStep;
    io.emit('SetSpeedScale', speedScale);
    updateSpeedScaleDisplay();
  };
  page.getElement('slower').onclick = () => {
    speedScale -= speedScaleStep;
    io.emit('SetSpeedScale', speedScale); 
    updateSpeedScaleDisplay();
  };
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      io.emit('Toggle');
    }
  });
}

run();
