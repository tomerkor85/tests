#!/bin/bash

# בדיקה אם Docker מותקן
if ! command -v docker &> /dev/null; then
    echo "Docker לא מותקן. אנא התקן Docker לפני הרצת הסקריפט."
    exit 1
fi

# בדיקה אם Docker Compose מותקן
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose לא מותקן. אנא התקן Docker Compose לפני הרצת הסקריפט."
    exit 1
fi

# הרצת השירותים
echo "מתחיל להריץ את כל השירותים..."
docker-compose up -d

# בדיקת סטטוס
echo "מחכה לשירותים להתחיל..."
sleep 10

# בדיקת סטטוס השירותים
echo "סטטוס השירותים:"
docker-compose ps

echo "המערכת מוכנה! האפליקציה זמינה בכתובת: http://localhost:3000" 