const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Настройка статической раздачи файлов из папки images
app.use('/cdn', express.static(path.join(__dirname, 'images'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false // Отключаем индексные файлы
}));

// Обработчик для проверки существования изображения
app.get('/cdn/:imageName', (req, res, next) => {
    const imageName = req.params.imageName;
    
    // Защита от path traversal атак
    if (imageName.includes('..') || imageName.includes('/') || imageName.includes('\\')) {
        return res.status(400).json({
            error: 'Invalid image name',
            message: 'Image name contains invalid characters'
        });
    }
    
    const imagePath = path.join(__dirname, 'images', imageName);
    
    // Проверяем существование файла
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({
                error: 'Image not found',
                message: `Image '${imageName}' does not exist`
            });
        }
        // Если файл существует, передаем управление статическому middleware
        next();
    });
});

// Маршрут для получения списка всех изображений
app.get('/cdn-list', (req, res) => {
    const imagesDir = path.join(__dirname, 'images');
    
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).json({
                error: 'Server error',
                message: 'Could not read images directory'
            });
        }
        
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file)
        );
        
        // Создаем полные URL для каждого изображения
        const baseUrl = `${req.protocol}://${req.get('host')}/cdn`;
        const imagesWithUrls = imageFiles.map(file => ({
            name: file,
            url: `${baseUrl}/${file}`
        }));
        
        res.json({
            images: imagesWithUrls,
            count: imageFiles.length
        });
    });
});

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.json({
        message: 'CDN Server is running',
        endpoints: {
            getImage: 'GET /cdn/:imageName',
            listImages: 'GET /cdn-list',
            example: `http://localhost:${PORT}/cdn/your-image.jpg`
        }
    });
});

// Обработчик 404 - исправленная версия
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Route ${req.originalUrl} does not exist`,
        availableRoutes: {
            home: 'GET /',
            getImage: 'GET /cdn/:imageName',
            listImages: 'GET /cdn-list'
        }
    });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong on the server'
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 CDN server running on port ${PORT}`);
    console.log(`📸 Access images: http://localhost:${PORT}/cdn/image_name`);
    console.log(`📋 List images: http://localhost:${PORT}/cdn-list`);
    
    // Проверяем существование папки images
    const imagesDir = path.join(__dirname, 'images');
    if (!fs.existsSync(imagesDir)) {
        console.log('📁 Creating images directory...');
        fs.mkdirSync(imagesDir, { recursive: true });
    }
});

module.exports = app;