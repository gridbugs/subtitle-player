import express from 'express';
import fs from 'fs';
import yargs from 'yargs';
import * as socketIo from 'socket.io';
import * as http from 'http';
import * as srt from '../common/srt';

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

function readSubtitlesSync(subtitlesPath: string): string {
  const fileContentsBuffer = fs.readFileSync(subtitlesPath);
  return fileContentsBuffer.toString();
}

type Handler = (req: express.Request<{}, {}, {}, Record<string, string>>, res: express.Response) => void;

function getWatchHandler(subtitles: srt.Subtitle[]): Handler {
  return (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <body>
    <div hidden=true id='subtitles-json'>${JSON.stringify(subtitles)}</div>
    <div id='subtitles-display'></div>
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
      #subtitles-display {
        height: 8em;
      }
    </style>
  </head>
  <body>
    <div hidden=true id='subtitles-json'>${JSON.stringify(subtitles)}</div>
    <input type='button' value='Play' id='play'/>
    <input type='button' value='Pause' id='pause'/>
    <div id='subtitles-display'></div>
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
    this.currentTimeMs = 1000000;
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
}

function run(): void {
  const { subtitlesPath, port } = parseArgs();
  const srtString = readSubtitlesSync(subtitlesPath);
  const srtStringCleaned = srtString.replace(/[^\x00-\x7F]/g, '');
  const subtitles = srt.parseSrtString(srtStringCleaned);
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
