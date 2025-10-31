FROM node:20-alpine

WORKDIR /app

# Install unzip utility
RUN apk add --no-cache unzip

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Extract asset ZIP files
RUN cd public/assets && \
    unzip -o Top_Down_Survivor.zip && \
    unzip -o topdown-shooter.zip && \
    unzip -o gore-assets.zip && \
    rm -f *.zip

# Expose port
EXPOSE 5500

# Start the server
CMD ["node", "server.js"]
