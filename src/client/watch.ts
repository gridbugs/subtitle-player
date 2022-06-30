import * as socketIoClient from 'socket.io-client';
import * as page from './page';
import * as srt from '../common/srt';
import * as timestamp from '../common/timestamp';

function run() {
  const displayElement = page.getSubtitlesDisplayElement();
  const subtitles = page.getSubtitles();
  console.log(subtitles);
  const io = socketIoClient.io();
  io.on('SetTime', (timeMs) => {
    const time = timestamp.fromMillis(timeMs);
    const subtitle = srt.findSubtitleAtTime(subtitles, time);
    const prettyTime = timestamp.prettyPrint(time);
    if (subtitle === null) {
      displayElement.innerHTML = `${prettyTime}`;
    } else {
      displayElement.innerHTML = `${prettyTime}<br/>${srt.htmlPrintSubtitleText(subtitle.text)}`;
    }
  });
}

run();
