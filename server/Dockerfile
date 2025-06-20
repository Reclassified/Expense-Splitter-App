# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source code
COPY . .

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run the app when the container launches
CMD ["node", "index.js"] 