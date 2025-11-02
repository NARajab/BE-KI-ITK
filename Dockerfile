# Gunakan image Node.js versi 18
FROM node:18

# Buat direktori kerja
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Tambahkan path ke sequelize CLI (optional tapi berguna)
ENV PATH /app/node_modules/.bin:$PATH

# Salin semua file ke dalam container (pastikan .dockerignore digunakan)
COPY . .

CMD ["npm", "run", "dev"]

# Buka port sesuai app (kalau pakai 9000, sesuaikan juga di EXPOSE)
EXPOSE 3000