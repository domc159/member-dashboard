FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install next@latest

# Copy source
COPY . .

# Configure Next.js and Tailwind
RUN echo 'module.exports = {typescript: {ignoreBuildErrors: true},eslint: {ignoreDuringBuilds: true}}' > next.config.js
RUN echo 'module.exports = {content: ["./app/**/*.{js,ts,jsx,tsx}","./components/**/*.{js,ts,jsx,tsx}"],theme: {extend: {}},plugins: []}' > tailwind.config.js

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV development

# Start in development mode
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"] 