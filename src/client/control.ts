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

function run() {
  const displayElement = page.getSubtitlesDisplayElement();
  const subtitles = page.getSubtitles();
  const io = socketIoClient.io();
  io.on('SetTime', (timeMs) => {
    const ts = timestamp.fromMillis(timeMs);
    displayElement.innerHTML = subtitleTextToShowAtTime(subtitles, ts);
  });
  page.getElement('play').onclick = () => {
    io.emit('Play');
  };
  page.getElement('pause').onclick = () => {
    io.emit('Pause');
  };
}

run();
