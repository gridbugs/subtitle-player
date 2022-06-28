import express from 'express';
import fs from 'fs';
import yargs from 'yargs';
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
    <div hidden=true id="subtitles-json">${JSON.stringify(subtitles)}</div>
    <script src='/watch.js'></script>
  </body>
</html>`);
  };
}

function run(): void {
  const { subtitlesPath, port } = parseArgs();
  const srtString = readSubtitlesSync(subtitlesPath);
  const srtStringCleaned = srtString.replace(/[^\x00-\x7F]/g, "");
  const subtitles = srt.parseSrtString(srtStringCleaned);
  const app = express();
  app.route('/watch').get(getWatchHandler(subtitles));
  app.use(express.static('dist'));
  app.use(express.static('third-party'));
  app.listen(port, () => console.log(`server running on port ${port}`));
}

run();
