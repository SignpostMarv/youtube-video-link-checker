import {
	Video,
	Info_Card,
} from './src/Video.js';
import {
	youtube_v3,
	google,
} from 'googleapis';
import auth_json from './google-api.auth.json' assert {type: 'json'};

const [,, channel_id, domains_csv] = process.argv;

const domains = domains_csv.split(',').map(e => e.trim());

const auth = new google.auth.GoogleAuth({
	credentials: auth_json,
	scopes: [
		'https://www.googleapis.com/auth/youtube.readonly',
		'https://www.googleapis.com/auth/youtube.force-ssl',
	]
});

const youtube = new youtube_v3.Youtube(
	{
		auth,
	},
);

const videos = await Video.get_videos_for_channel(youtube, channel_id);

const log_this:([string]|[string, Info_Card[]])[] = [];
const urls:string[] = [];

for (const video of videos) {
	const cards = (await Video.info_cards(video)).filter((maybe) => {
		return domains.filter((domain) => {
			return (maybe?.cardRenderer?.content?.simpleCardContentRenderer?.command.urlEndpoint.url || '').includes(domain);
		}).length;
	});

	if (cards.length || domains.filter((maybe) => {
		return video.description.includes(maybe);
	}).length) {
		const url = `https://youtu.be/${video.id}`;

		if (urls.includes(url)) {
			continue;
		}

		if (cards.length) {
			log_this.push([url, cards]);
		} else {
			log_this.push([url]);
		}
	}
}

for (const log_that of log_this) {
	console.log(...log_that);
}

if (!log_this.length) {
	console.log('all done 👍');
}
