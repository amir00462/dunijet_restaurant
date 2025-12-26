FROM node:18-alpine

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs
RUN adduser -S danijet -u 1001

WORKDIR /app

RUN chown -R danijet:nodejs /app
USER danijet

COPY --chown=danijet:nodejs package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --chown=danijet:nodejs . .

RUN mkdir -p /tmp && chown -R danijet:nodejs /tmp

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "start"]

