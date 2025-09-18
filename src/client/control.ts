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

type Sync = {
  seekPositionMs: number;
  realTime: Date;
}

function getSyncStats(sync1: Sync, sync2: Sync) {
  const deltaSeekMs = sync2.seekPositionMs - sync1.seekPositionMs;
  const deltaRealMs = sync2.realTime.getTime() - sync1.realTime.getTime();
  const speed = deltaSeekMs / deltaRealMs;
  return { deltaSeekMs, deltaRealMs, speed };
}

function run() {
  const displayElement = page.getSubtitlesDisplayElement();
  const subtitles = page.getSubtitles();
  const subtitlesHtml = subtitles.map(subtitleToHtml).join('\n');
  const timeMarkersHtml = mkTimeMarkersHtml(subtitles[subtitles.length - 1].period.end);
  let sync1: Sync = {
    seekPositionMs: 0,
    realTime: new Date(),
  };
  let sync2: Sync | null = null;
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
    e.innerHTML = `Speed: ${speedScale.toFixed(3)}x`;
  }
  function updateSyncInfoDisplay() {
    const e = page.getElement('sync-info');
    const seek1 = timestamp.prettyPrint(timestamp.fromMillis(sync1.seekPositionMs));
    const real1 = sync1.realTime.toISOString();
    const line1 = `Sync 1: ${seek1} @ ${real1}`;
    let line2 = "";
    let line3 = "";
    let line4 = "";
    if (sync2 !== null) {
      const seek2 = timestamp.prettyPrint(timestamp.fromMillis(sync2.seekPositionMs));
      const real2 = sync2.realTime.toISOString();
      line2 = `Sync 2: ${seek2} @ ${real2}`;
      const { deltaSeekMs, deltaRealMs, speed } = getSyncStats(sync1, sync2);
      line3 = `Delta: ${deltaSeekMs}ms over ${deltaRealMs}ms (real)`;
      line4 = `Implied speed: ${speed.toFixed(3)}x`;
    }
    e.innerHTML = `<p">${line1}</p><p>${line2}</p><p>${line3}</p><p>${line4}</p>`;
  }
  updateSpeedScaleDisplay();
  updateSyncInfoDisplay();
  const speedScaleStep = 0.001;
  (page.getElement('faster') as HTMLButtonElement).value = `Speed +${speedScaleStep}x`;
  (page.getElement('slower') as HTMLButtonElement).value = `Speed -${speedScaleStep}x`;
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
  page.getElement('speed-reset').onclick = () => {
    speedScale = 1;
    io.emit('SetSpeedScale', speedScale);
    updateSpeedScaleDisplay();
  };
  page.getElement('sync1').onclick = () => {
    sync1 = {
      seekPositionMs: currentTimeMs,
      realTime: new Date(),
    };
    sync2 = null;
    updateSyncInfoDisplay();
  };
  page.getElement('sync2').onclick = () => {
    console.log(currentTimeMs);
    const sync2Candidate = {
      seekPositionMs: currentTimeMs,
      realTime: new Date(),
    };
    if (sync2Candidate.seekPositionMs > sync1.seekPositionMs) {
      sync2 = sync2Candidate;
      updateSyncInfoDisplay();
      const { speed } = getSyncStats(sync1, sync2);
      speedScale = speed;
      io.emit('SetSpeedScale', speedScale);
      updateSpeedScaleDisplay();
    }
  };
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      io.emit('Toggle');
    }
  });
}

run();
