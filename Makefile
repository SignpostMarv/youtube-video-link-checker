npm-install:
	@docker run --rm -it \
		-u $(shell id -u):$(shell id -g) \
		-w /app/ \
		-v $(shell pwd):/app/ \
		-v ${HOME}/.npm/:/.npm/ \
		node:20-alpine \
		npm install

by-channel:
	@docker run --rm -it \
		-u $(shell id -u):$(shell id -g) \
		-w /app/ \
		-v $(shell pwd):/app/ \
		-v ${HOME}/.npm/:/.npm/ \
		node:20-alpine \
		node --loader ts-node/esm \
		./by-channel.ts ${CHANNEL_ID} ${DOMAINS}

by-txt:
	@docker run --rm -it \
		-u $(shell id -u):$(shell id -g) \
		-w /app/ \
		-v $(shell pwd):/app/ \
		-v ${HOME}/.npm/:/.npm/ \
		node:20-alpine \
		node --loader ts-node/esm \
		./by-txt.ts ${DOMAINS}
