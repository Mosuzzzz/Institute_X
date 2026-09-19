FROM node:24-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY . .
RUN npm run build

FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system nodejs && adduser --system --ingroup nodejs nextjs
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3001

CMD ["npm", "run", "start"]
