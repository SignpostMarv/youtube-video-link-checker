import {
	Video,
} from './src/Video.js';
import {
	Log,
} from './src/Filter.js';
import {
	youtube,
} from './src/YouTube.js';
import {readFile} from "fs/promises";
import {dirname} from "path";
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const [,, domains_csv] = process.argv;

const video_ids = (
	await readFile(`${__dirname}/video-ids.txt`) + ''
).split('\n').map(e => e.trim()).filter((maybe) => {
	return /^[A-Za-z0-9\-_]{11}$/.test(maybe);
});
const domains = domains_csv.split(',').map(e => e.trim());

console.log(video_ids.length);

const videos = await Video.get_videos_by_id(youtube, video_ids);

await Log(videos, domains);
