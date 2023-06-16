npm-install:
	@docker run --rm -it \
		-u $(shell id -u):$(shell id -g) \
		-w /app/ \
		-v $(shell pwd):/app/ \
		-v ${HOME}/.npm/:/.npm/ \
		node:20-alpine \
		npm install

run:
	@docker run --rm -it \
		-u $(shell id -u):$(shell id -g) \
		-w /app/ \
		-v $(shell pwd):/app/ \
		-v ${HOME}/.npm/:/.npm/ \
		node:20-alpine \
		node --loader ts-node/esm \
		./app.ts ${CHANNEL_ID} ${DOMAINS}
