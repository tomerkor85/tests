#!/bin/bash

echo "עוצר את כל השירותים..."
docker-compose down

echo "מנקה את כל ה-volumes..."
docker-compose down -v

echo "בנה מחדש את כל התמונות..."
docker-compose build --no-cache

echo "הרץ את כל השירותים..."
docker-compose up -d

echo "בדוק את הסטטוס..."
docker-compose ps

echo "כל השירותים נעצרו בהצלחה!" 