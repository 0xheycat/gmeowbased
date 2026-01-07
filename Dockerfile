# Multi-stage build to minimize image size
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Dependencies stage - install only production dependencies
FROM base AS deps
WORKDIR /app

# Copy only package files for dependency installation
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline --prod=false

# Builder stage - build the application
FROM base AS builder
WORKDIR /app

# Copy build-time env placeholders
COPY .env.build .env

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only necessary source files for build
# Explicitly exclude large folders by not copying them
COPY package.json pnpm-lock.yaml next.config.js tsconfig.json ./
COPY components.json postcss.config.js tailwind.config.ts ./
COPY middleware.ts ./
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY types ./types
COPY config ./config
COPY abi ./abi
COPY scripts ./scripts
COPY supabase ./supabase
COPY migrations ./migrations

# Build the application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Runner stage - production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/lib ./lib

EXPOSE 3000

ENV PORT=3000

CMD ["node_modules/.bin/next", "start"]
