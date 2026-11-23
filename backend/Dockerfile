FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY src ./src
RUN npx prisma generate
USER node
EXPOSE 4000
CMD ["sh", "-c", "attempt=1; until npx prisma migrate deploy; do if [ \"$attempt\" -ge 10 ]; then echo 'Prisma migrations could not reach Neon after 10 attempts.'; exit 1; fi; attempt=$((attempt + 1)); echo 'Neon is temporarily unavailable; retrying migration in 10 seconds.'; sleep 10; done; exec node src/server.js"]
