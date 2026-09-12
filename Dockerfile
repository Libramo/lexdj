# Base image — Node.js 24 on Alpine Linux (lightweight, only ~5MB)
FROM node:24-alpine

# Set the working directory inside the container
# All commands after this run from /app
WORKDIR /app

# Copy package.json and package-lock.json first
# We do this before copying the rest to take advantage of Docker's cache
COPY package*.json ./

# Install dependencies
# npm ci is stricter than npm install — uses exact versions from package-lock.json
RUN npm ci

# Copy the rest of the project files into the container
COPY . .

# NEXT_PUBLIC_* vars get compiled directly into the client JS bundle during
# the build below — they must be passed in as build args (see
# docker-compose.yml's nextjs.build.args), not just set on the running
# container, or Next.js bakes in `undefined` for anything read at build time.
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_UMAMI_SCRIPT_URL=$NEXT_PUBLIC_UMAMI_SCRIPT_URL
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID

# Build the Next.js app
RUN npm run build

# Tell Docker this container uses port 3000
# This is documentation only — doesn't actually open the port
EXPOSE 3000

# The command to run when the container starts
CMD ["npm", "start"]