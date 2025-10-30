const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Host: ${req.get('host')}`);
    next();
});

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Статическая раздача
app.use('/', express.static(path.join(__dirname, 'images'), {
    maxAge: '365d',
    etag: true,
    lastModified: true,
    index: false
}));

// Проверка существования изображения
app.get('/:imageName', (req, res, next) => {
    const imageName = req.params.imageName;
    
    if (imageName === '' || imageName === 'cdn-list') return next();
    
    if (imageName.includes('..') || imageName.includes('/') || imageName.includes('\\')) {
        return res.status(400).json({ error: 'Invalid image name' });
    }
    
    const imagePath = path.join(__dirname, 'images', imageName);
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) return res.status(404).json({ error: 'Image not found' });
        next();
    });
});

// Список изображений
app.get('/cdn-list', (req, res) => {
    const imagesDir = path.join(__dirname, 'images');
    
    fs.readdir(imagesDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(file)
        );
        
        const imagesWithUrls = imageFiles.map(file => ({
            name: file,
            url: `https://cdn.partylight33.ru/${file}`,
            size: fs.statSync(path.join(imagesDir, file)).size
        }));
        
        res.json({
            server: 'cdn.partylight33.ru',
            images: imagesWithUrls,
            count: imageFiles.length
        });
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.json({
        message: 'CDN Server is running on cdn.partylight33.ru',
        endpoints: {
            getImage: 'GET /:imageName',
            listImages: 'GET /cdn-list'
        }
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CDN server running on port ${PORT}`);
    console.log(`🌐 Access via: https://cdn.partylight33.ru`);
});

module.exports = app;