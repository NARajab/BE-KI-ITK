FROM node:18-alpine

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code ke dalam container
COPY . .

# Jalankan aplikasi
CMD ["npm", "start"]
