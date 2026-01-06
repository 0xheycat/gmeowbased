# Multi-stage build to minimize image size
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Dependencies stage - install only production dependencies
FROM base AS deps
WORKDIR /app

# Copy only package files for dependency installation
COPY package.json pnpm-lock.yaml ./
COPY gmeow-indexer/package.json gmeow-indexer/package-lock.json ./gmeow-indexer/

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline --prod=false

# Builder stage - build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/gmeow-indexer/node_modules ./gmeow-indexer/node_modules

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
COPY gmeow-indexer ./gmeow-indexer
COPY abi ./abi
COPY supabase ./supabase
COPY migrations ./migrations

# Build the application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Runner stage - minimal production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
