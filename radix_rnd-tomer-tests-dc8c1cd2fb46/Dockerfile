FROM node:18-alpine

WORKDIR /app

# התקנת תלויות מערכת
RUN apk add --no-cache python3 make g++

# העתקת קבצי הפרויקט
COPY package*.json ./

# התקנת תלויות
RUN npm install --build-from-source

# העתקת שאר הקבצים
COPY . .

# חשיפת הפורט
EXPOSE 3000

# הרצת האפליקציה
CMD ["npm", "start"] 