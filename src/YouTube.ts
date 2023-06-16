import {
	youtube_v3,
	google,
} from 'googleapis';
import auth_json from '../google-api.auth.json' assert {type: 'json'};


const auth = new google.auth.GoogleAuth({
	credentials: auth_json,
	scopes: [
		'https://www.googleapis.com/auth/youtube.readonly',
		'https://www.googleapis.com/auth/youtube.force-ssl',
	]
});

export const youtube = new youtube_v3.Youtube(
	{
		auth,
	},
);
