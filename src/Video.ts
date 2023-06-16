import {
	dirname,
} from 'path';
import {
	fileURLToPath,
} from 'url';
import {
	constants as fs_constants,
} from 'fs';
import {
	access,
	writeFile,
	readFile,
} from 'fs/promises';
import {
	youtube_v3,
} from 'googleapis';
import {
// @ts-ignore
	Params$Resource$Search$List, Params$Resource$Videos$List,
// @ts-ignore
	Schema$SearchListResponse,
// @ts-ignore
	Schema$SearchResult, Schema$Video, Schema$VideoListResponse,
} from 'googleapis/build/src/apis/youtube/v3';
import {
	parseDocument,
} from 'htmlparser2';
import {
	findAll,
} from 'domutils';
import {
	Text,
} from 'domhandler';

export type Info_Card = {
	cardRenderer: {
		content?: {
			videoInfoCardContentRenderer?: {
				action?: {
					watchEndpoint?: {
						videoId?: any,
					}
				}
			},
			playlistInfoCardContentRenderer?: {
				action?: {
					watchEndpoint?: {
						playlistId?: any,
					}
				}
			},
			collaboratorInfoCardContentRenderer?: {
				channelName: {
					simpleText: string,
				},
				endpoint: {
					commandMetadata: {
						webCommandMetadata: {
							url: string,
						},
					},
				},
			},
			simpleCardContentRenderer?: {
				title: {
					simpleText: string,
				},
				callToAction: {
					simpleText: string,
				},
				command: {
					urlEndpoint: {
						url: string,
					},
				},
			},
		}
	},
};

const __dirname = dirname(fileURLToPath(import.meta.url));

async function search_channel(
	api: youtube_v3.Youtube,
	params: Params$Resource$Search$List
): Promise<Schema$SearchListResponse> {
	return new Promise((yup, nope) => {
		try {
			api.search.list(
				params,
				(err:Error|null, response:Schema$SearchListResponse) => {
					if (err) {
						nope(err);

						return;
					}

					yup(response);
				}
			);
		} catch (err) {
			nope(err);
		}
	}) ;
}

async function list_videos(
	api: youtube_v3.Youtube,
	params:Params$Resource$Videos$List
): Promise<Schema$VideoListResponse> {
	return new Promise((yup, nope) => {
		try {
			api.videos.list(params, (err:Error|null, response:Schema$VideoListResponse) => {
				if (err) {
					nope(err);

					return;
				}

				yup(response);
			});
		} catch (err) {
			nope(err);
		}
	});
}

async function list_videos_auto_handle_pages(
	api: youtube_v3.Youtube,
	video_ids: string[]
): Promise<Schema$Video[]> {
	let videos:Schema$Video[] = [];
	let page = 0;

	for (let i = 0; i < video_ids.length; i += 50) {
		console.log(`checking page ${++page}`);
		const chunk = video_ids.slice(i, i + 50);

		const params:Params$Resource$Videos$List = {
			part: ['snippet'],
			id: chunk.join(','),
		};

		let results = await list_videos(api, params);

		videos.push(...results.data.items);

		while (results.data.nextPageToken) {
			params.pageToken = results.data.pageToken;
			results = await list_videos(api, params);
			videos.push(...results.data.items);
		}
	}

	return videos;
}

async function exists(filepath:string): Promise<boolean> {
	return await new Promise((done) => {
		access(
			filepath,
			fs_constants.F_OK
		).then(() => {
			done(true);
		}).catch(() => {
			done(false);
		});
	});
}

export class Video
{
    readonly id:string;

	readonly description:string;

    constructor(video_id:string, description:string) {
        if (! /^[A-Za-z0-9\-_]{11}/.test(video_id)) {
            throw new Error(`Unsupported video id: ${video_id}`);
        }

        this.id = video_id;
		this.description = description;
    }

    private static async fetch_page(video:Video) : Promise<string>
    {
		const file_cache = `${__dirname}/../cache/youtube-video-pages/${video.id}.html`;

		if ( ! await exists(file_cache)) {
			const page = await (await fetch(`https://www.youtube.com/watch?v=${video.id}`)).text();

			await writeFile(file_cache, page);
		}

		return (await readFile(file_cache)) + '';
    }

	public static async info_cards(video:Video) : Promise<Info_Card[]>
	{
		const file_cache = `${__dirname}/../cache/youtube-info-cards/${video.id}.json`;

		if ( ! await exists(file_cache)) {
			const page = await this.fetch_page(video);

			const document = parseDocument(page);

			const cards = findAll((maybe) => {
				return 'script' === maybe.name && !!maybe.childNodes.find((inner_maybe) => {
					return inner_maybe instanceof Text && inner_maybe.data.includes('ytInitialPlayerResponse =');
				});
			}, document.childNodes).map((script_tag) => {
				return (script_tag.childNodes.filter((maybe) => {
					return maybe instanceof Text && maybe.data.includes('ytInitialPlayerResponse =');
				}) as Text[]).reduce((was, text: Text) => {
					return was + text.data;
				}, '');
			}).map((script): Info_Card[] => {
				let pass = /ytInitialPlayerResponse = (.+);(var|const|let)/.exec(script);

				if (!pass) {
					pass = /ytInitialPlayerResponse = (.+);$/.exec(script);
				}

				if (pass) {
					const raw = JSON.parse(pass[1]);

					if (
						raw
						&& 'cards' in raw
						&& 'cardCollectionRenderer' in raw.cards
						&& 'cards' in raw.cards.cardCollectionRenderer
					) {
						return raw.cards.cardCollectionRenderer.cards;
					}
				}

				return [];
			}).reduce((was, is) => {
				was.push(...is);

				return was;
			}, []);

			await writeFile(file_cache, JSON.stringify(cards, null, '\t') + '\n');
		}

		return JSON.parse(await readFile(file_cache) + '') as Info_Card[];
	}

	public static async get_videos_for_channel(api: youtube_v3.Youtube, channel_id:string) : Promise<Video[]>
	{
		const file_cache = `${__dirname}/../cache/youtube-api/videos-by-channel/${channel_id}.json`;

		if ( ! await exists(file_cache)) {
			console.log('performing api calls');

			const api_results = await new Promise(async (yup, nope) => {
				try {
					const items:Schema$SearchResult[] = [];
					const video_ids:string[] = [];

					let params:Params$Resource$Search$List = {
						channelId: channel_id,
						part: ['snippet'],
						type: 'video',
						maxResults: 50,
					};
					let results = await search_channel(api, params);

					items.push(...results.data.items);
					let page = 1;

					while (results.data.nextPageToken) {
						console.log(`checking page ${++page}`);
						params.pageToken = results.data.nextPageToken;
						results = await search_channel(api, params);
						items.push(...results.data.items);
					}

					for (const item of items) {
						if ( ! video_ids.includes(item.id.videoId)) {
							video_ids.push(item.id.videoId);
						}
					}

					yup(video_ids);
				} catch (err) {
					nope(err);
				}
			});

			await writeFile(file_cache, JSON.stringify(api_results, null, '\t') + '\n');
		} else {
			console.log('skipping api calls in favour of file cache');
		}

		const video_ids = (JSON.parse(await readFile(file_cache) + '') as string[]);

		return this.get_videos_by_id(api, video_ids);
	}

	public static async get_videos_by_id(api: youtube_v3.Youtube, video_ids:string[]) : Promise<Video[]>
	{

		const videos:Schema$Video[] = [];

		const video_ids_to_check:string[] = [];

		for (const video_id of video_ids) {
			const video_file_cache = `${
				__dirname
			}/../cache/youtube-api/videos/${video_id}.json`;

			if ( ! await exists(video_file_cache)) {
				video_ids_to_check.push(video_id);
			}
		}

		for (const video of await list_videos_auto_handle_pages(api, video_ids_to_check)) {
			const video_file_cache = `${
				__dirname
			}/../cache/youtube-api/videos/${video.id}.json`;

			await writeFile(video_file_cache, JSON.stringify(video, null, '\t') + '\n');
		}

		for (const video_id of video_ids) {
			const video_file_cache = `${
				__dirname
			}/../cache/youtube-api/videos/${video_id}.json`;

			videos.push(JSON.parse(await readFile(video_file_cache) + '') as Schema$Video);
		}

		return videos.map(
			(item) => {
				return new Video(item.id, item.snippet.description);
			}
		);
	}
}
