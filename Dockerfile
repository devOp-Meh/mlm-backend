FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Run tests (optional)
RUN npm run test

# Expose the application port
EXPOSE 5000

# Command to start the application
CMD ["node", "server.js"]
