# Running

## By YouTube channel ID

`CHANNEL_ID=foo DOMAINS=example.com,example.net make by-channel`, where `foo` is the YouTube channel ID.

## Via text file
If you have a channel with more than 500 videos:

1. obtain the list of video ids then place into `video-ids.txt`
2. `DOMAINS=example.com,example.net make by-txt`
