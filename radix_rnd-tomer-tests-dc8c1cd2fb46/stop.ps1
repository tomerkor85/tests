Write-Host "עוצר את כל השירותים..."
docker-compose down

Write-Host "מנקה את כל ה-volumes..."
docker-compose down -v

Write-Host "כל השירותים נעצרו בהצלחה!" 