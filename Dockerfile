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

# Build the Next.js app
RUN npm run build

# Tell Docker this container uses port 3000
# This is documentation only — doesn't actually open the port
EXPOSE 3000

# The command to run when the container starts
CMD ["npm", "start"]