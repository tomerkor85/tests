# 1. עצור את כל הקונטיינרים
docker-compose down

# 2. מחק את כל ה-volumes
docker-compose down -v

# 3. מחק את תיקיית node_modules המקומית
rm -rf node_modules

# 4. בנה מחדש את כל התמונות
docker-compose build --no-cache

# 5. הרץ את כל השירותים
docker-compose up -d

# 6. בדוק את הלוגים של האפליקציה
docker-compose logs -f app