FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.mjs security.mjs platform.mjs ui.mjs rules.mjs ./
COPY --chown=node:node db ./db
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node","server.mjs"]
