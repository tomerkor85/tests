const express = require('express');
const path = require('path');

// ייבוא קובץ ה-app המרכזי
const app = require('./api/app');

// יצירת נקודת כניסה מרכזית לשרת
const PORT = process.env.PORT || 3000;

// הפעלת השרת
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
