import {
	Info_Card,
	Video,
} from './Video.js';
import {youtube_v3} from "googleapis";

export async function Filter(videos:Video[], domains:string[]): Promise<Video[]> {
	const matches:Video[] = [];

	for (const video of videos) {
		const cards = (await Video.info_cards(video)).filter((maybe) => {
			return domains.filter((domain) => {
				return (maybe?.cardRenderer?.content?.simpleCardContentRenderer?.command.urlEndpoint.url || '').includes(domain);
			}).length;
		});

		if (
			cards.length
			|| domains.filter((maybe) => {
				return video.description.includes(maybe);
			}).length
		) {
			matches.push(video);
		}
	}

	return matches;
}

export async function Log(videos:Video[], domains:string[]): Promise<void> {
	const log_this:([string]|[string, Info_Card[]])[] = [];

	for (const video of await Filter(videos, domains)) {
		const cards = (await Video.info_cards(video)).filter((maybe) => {
			return domains.filter((domain) => {
				return (maybe?.cardRenderer?.content?.simpleCardContentRenderer?.command.urlEndpoint.url || '').includes(domain);
			}).length;
		});

		const url = `https://youtu.be/${video.id}`;

		if (cards.length) {
			log_this.push([url, cards]);
		} else {
			log_this.push([url]);
		}
	}

	for (const log_that of log_this) {
		console.log(...log_that);
	}

	if (!log_this.length) {
		console.log('all done 👍');
	}
}
