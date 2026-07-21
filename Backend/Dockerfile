FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create temp directory with proper permissions for multer
RUN mkdir -p public/temp && chown -R node:node public/temp

# Run as non-root user
USER node

EXPOSE 8000

CMD ["npm", "start"]
