# Use Node.js with Playwright pre-installed (matching installed version)
FROM mcr.microsoft.com/playwright:v1.57.0-noble

WORKDIR /app

# Set Playwright to use a shared browser location accessible to all users
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers in the shared location
RUN npx playwright install chromium

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the app
CMD ["npm", "start"]
