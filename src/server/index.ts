import express from 'express';
import yargs from 'yargs';
import * as socketIo from 'socket.io';
import * as http from 'http';
import * as srt from '../common/srt';
import * as timestamp from '../common/timestamp';
import readTextFile from './text_file';

const DEFAULT_PORT = 3000;

type Args = {
  subtitlesPath: string,
  port: number,
};

function parseArgs(): Args {
  const argv = yargs
    .option('subtitles-path', {
      alias: 's',
      description: 'path to subtitles file',
      type: 'string',
      demandOption: true,
    })
    .option('port', {
      alias: 'p',
      description: 'port number to run website on',
      type: 'number',
      default: DEFAULT_PORT,
    })
    .help()
    .parseSync();
  return {
    subtitlesPath: argv['subtitles-path'],
    port: argv['port'],
  };
}

type Handler = (req: express.Request<{}, {}, {}, Record<string, string>>, res: express.Response) => void;

function getWatchHandler(subtitles: srt.Subtitle[]): Handler {
  return (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <style>
      #subtitles-display {
        font-size: 36pt;
        text-align: center;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #000;
      }
      #video {
        position: fixed;
        bottom: 0;
      }
    </style>
  </head>
  <body>
    <div hidden=true id='subtitles-json'>${JSON.stringify(subtitles)}</div>
    <div id='subtitles-display'></div>
    <video id='video' width="320" height="240" autoplay muted loop>
      <source src="/resources/muted-blank.mp4" type="video/mp4">
    </video>
    <script src='/watch.js'></script>
  </body>
</html>`);
  };
}

function getControlHandler(subtitles: srt.Subtitle[]): Handler {
  return (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <style>
      * {
        padding: 0;
        margin: 0;
        font-size: 24pt;
      }
      .button {
        width: 20%;
        height: 2em;
      }
      #subtitles-display {
        position: absolute;
        top: 5em;
        height: 4em;
      }
      #subtitles-seek {
        position: fixed;
        top: 10em;
        bottom: 0;
        left: 0;
        right: 0;
        overflow: scroll;
      }
      #subtitles-seek div.subtitle {
        position: absolute;
        background-color: rgb(127, 187, 187);
        padding-left: 0.5em;
        padding-right: 0.5em;
      }
      #subtitles-seek div.time-marker {
        position: absolute;
        border-top: 1px solid black;
        width: 100%;
        text-align: center;
      }
      #subtitles-seek div#cursor {
        position: absolute;
        border-top: 4px solid red;
        width: 100%;
      }
   </style>
  </head>
  <body>
    <div hidden=true id='subtitles-json'>${JSON.stringify(subtitles)}</div>
    <input class='button' type='button' value='Play' id='play'/>
    <input class='button' type='button' value='Pause' id='pause'/>
    <input class='button' type='button' value='Cursor' id='scroll-to-cursor'/>
    <br/>
    <input class='button' type='button' value='-1s' id='-1s'/>
    <input class='button' type='button' value='-0.1s' id='-0.1s'/>
    <input class='button' type='button' value='+0.1s' id='+0.1s'/>
    <input class='button' type='button' value='+1s' id='+1s'/>
    <div id='subtitles-display'></div>
    <div id='subtitles-seek'></div>
    <script src='/control.js'></script>
  </body>
</html>`);
  };
}

function getRootHandler(): Handler {
  return (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <body>
    <ul>
      <li><a href='/watch'>Watch</a></li>
      <li><a href='/control'>Control</a></li>
    </ul>
  </body>
</html>`)

  };
}

class AppState {
  private currentTimeMs: number;
  private playing: boolean;
  private previousTickTimeMs: number | null;

  constructor() {
    this.currentTimeMs = 0;
    this.playing = false;
    this.previousTickTimeMs = null;
  }

  tick(currentTickTimeMs: number) {
    if (this.playing) {
      let deltaMs: number;
      if (this.previousTickTimeMs === null) {
        deltaMs = 0;
      } else {
        deltaMs = currentTickTimeMs - this.previousTickTimeMs;
      }
      this.currentTimeMs += deltaMs;
      this.previousTickTimeMs = currentTickTimeMs;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getCurrentTimeMs(): number {
    return this.currentTimeMs;
  }

  pause(): void {
    this.playing = false;
    this.previousTickTimeMs = null;
  }

  play(): void {
    this.playing = true;
  }

  seekMs(timeMs: number): void {
    this.currentTimeMs = timeMs;
  }
}

async function run(): Promise<void> {
  const { subtitlesPath, port } = parseArgs();
  const srtString = await readTextFile(subtitlesPath);
  const subtitles = srt.parseSrtString(srtString);
  const app = express();
  const server = http.createServer(app);
  const io = new socketIo.Server(server);
  const state = new AppState();
  app.route('/').get(getRootHandler());
  app.route('/watch').get(getWatchHandler(subtitles));
  app.route('/control').get(getControlHandler(subtitles));
  app.use(express.static('dist'));
  io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('Play', () => {
      console.log('play');
      state.play();
    });
    socket.on('Pause', () => {
      console.log('pause');
      state.pause();
    });
    socket.on('Seek', (timeMs) => {
      console.log('seek', timestamp.prettyPrint(timestamp.fromMillis(timeMs)));
      state.seekMs(timeMs);
    });
  });
  server.listen(port, () => console.log(`server running on port ${port}`));

  const periodMs = 100;
  function tick() {
    state.tick(Date.now());
    io.emit('SetTime', state.getCurrentTimeMs());
    setTimeout(tick, periodMs);
  }

  tick();
}

run();
