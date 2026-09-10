require('dotenv').config();

const path = require('path');
const express = require('express');
const cloudinary = require('cloudinary');

const app = require('./backend/app');
const connectDatabase = require('./backend/config/database');

const PORT = process.env.PORT || 4000;


// Uncaught Exception
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
});


// Database Connection
connectDatabase();


// Cloudinary Configuration
if (
    process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}


// Production Deployment
if (process.env.NODE_ENV === 'production') {

    app.use(
        express.static(
            path.join(__dirname, 'frontend', 'build')
        )
    );

    app.get('*', (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                'frontend',
                'build',
                'index.html'
            )
        );
    });

} else {

    app.get('/', (req, res) => {
        res.send('Server is Running! 🚀');
    });

}


// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {

    console.log(`Error: ${err.message}`);

    server.close(() => {
        process.exit(1);
    });

});