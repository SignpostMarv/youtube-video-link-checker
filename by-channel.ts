import {
	Video,
	Info_Card,
} from './src/Video.js';
import {
	Log,
} from './src/Filter.js';
import {
	youtube,
} from './src/YouTube.js';

const [,, channel_id, domains_csv] = process.argv;

const domains = domains_csv.split(',').map(e => e.trim());

const videos = await Video.get_videos_for_channel(youtube, channel_id);

await Log(videos, domains);
