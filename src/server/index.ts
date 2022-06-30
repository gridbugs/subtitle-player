import express from 'express';
import fs from 'fs';
import yargs from 'yargs';
import * as socketIo from 'socket.io';
import * as http from 'http';
import * as srt from '../common/srt';
import * as timestamp from '../common/timestamp';

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
    <div hidden=true id="subtitles-json">${JSON.stringify(subtitles)}</div>
    <div id="subtitles-display"></div>
    <script src='/watch.js'></script>
  </body>
</html>`);
  };
}

class AppState {
  currentTimeMs: number;

  constructor() {
    this.currentTimeMs = 1000000;
  }

  tick(deltaMs: number) {
    this.currentTimeMs += deltaMs;
  }
}

function run(): void {
  const { subtitlesPath, port } = parseArgs();
  const srtString = readSubtitlesSync(subtitlesPath);
  const srtStringCleaned = srtString.replace(/[^\x00-\x7F]/g, "");
  const subtitles = srt.parseSrtString(srtStringCleaned);
  const app = express();
  const server = http.createServer(app);
  const io = new socketIo.Server(server);
  const state = new AppState();
  app.route('/watch').get(getWatchHandler(subtitles));
  app.use(express.static('dist'));
  io.on('connection', (_socket) => {
    console.log('a user connected');
  });
  server.listen(port, () => console.log(`server running on port ${port}`));

  const periodMs = 100;
  let previousTickTimeMs = Date.now();
  function tick() {
    const currentTickTimeMs = Date.now();
    const deltaMs = currentTickTimeMs - previousTickTimeMs;
    state.tick(deltaMs);
    io.emit('SetTime', state.currentTimeMs);
    previousTickTimeMs = currentTickTimeMs;
    setTimeout(tick, periodMs);
  }

  tick();
}

run();
