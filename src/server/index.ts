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

function base64Encode(s: string): string {
  return Buffer.from(s, 'binary').toString('base64');
}

type Handler = (req: express.Request<{}, {}, {}, Record<string, string>>, res: express.Response) => void;

function getWatchHandler(subtitles: srt.Subtitle[]): Handler {
  return (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
  <body>
    <script src='/require.js'></script>
    <script src='/index.js'></script>
    <script>
      const subtitlesJsonStringBase64 = '${base64Encode(JSON.stringify(subtitles))}';
      const subtitlesJsonString = atob(subtitlesJsonStringBase64);
      const subtitles = JSON.parse(subtitlesJsonString);
      requirejs(['client/index'], c => c.runWatch(subtitles));
    </script>
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