const mongoose = require('mongoose');
const connectDatabase = () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error("[MongoDB] ERROR: process.env.MONGO_URI is undefined. Make sure root .env is loaded.");
        return;
    }
    console.log("[MongoDB] Connecting to MongoDB...");
    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then((data) => {
            console.log(`MongoDB Connected: ${data.connection.host}`);
        })
        .catch((err) => {
            console.error("MongoDB Connection Error:", err.message);
        });
}

module.exports = connectDatabase;