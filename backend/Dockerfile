FROM node:25-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY prisma ./prisma
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM dependencies AS migration

COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:25-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system nodejs && adduser --system --ingroup nodejs nestjs
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN chown -R nestjs:nodejs /app
USER nestjs
EXPOSE 3000

# Production command: npm run start:prod
CMD ["npm", "run", "start:prod"]
