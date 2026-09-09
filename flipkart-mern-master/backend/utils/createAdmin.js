require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');

const createAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error("[Create Admin] ERROR: MONGO_URI is missing from environment variables.");
            process.exit(1);
        }

        console.log("[Create Admin] Connecting to MongoDB...");
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("[Create Admin] Connected to MongoDB.");

        const email = "admin@localhost.com";
        const plainPassword = "admin1234";

        let user = await User.findOne({ email }).select("+password");

        if (user) {
            console.log(`[Create Admin] Found existing user with email: ${email}. Updating to admin...`);
            user.name = "Admin";
            user.role = "admin";
            user.gender = user.gender || "Male";
            user.password = plainPassword; // pre('save') will bcrypt hash it
            if (!user.avatar || !user.avatar.url) {
                user.avatar = {
                    public_id: "admin_avatar",
                    url: "https://via.placeholder.com/150"
                };
            }
            await user.save();
            console.log(`[Create Admin] Admin user updated successfully! (Email: ${email}, Role: ${user.role})`);
        } else {
            console.log(`[Create Admin] Creating new admin user: ${email}...`);
            user = await User.create({
                name: "Admin",
                email,
                password: plainPassword,
                gender: "Male",
                role: "admin",
                avatar: {
                    public_id: "admin_avatar",
                    url: "https://via.placeholder.com/150"
                }
            });
            console.log(`[Create Admin] Admin user created successfully! (Email: ${email}, Role: ${user.role})`);
        }

        // Verify password hash comparison
        const isMatch = await user.comparePassword(plainPassword);
        if (isMatch) {
            console.log("[Create Admin] Verified: Password bcrypt comparison successful!");
        } else {
            console.error("[Create Admin] WARNING: Password verification failed.");
        }

        await mongoose.disconnect();
        console.log("[Create Admin] Finished. Exiting successfully.");
        process.exit(0);
    } catch (error) {
        console.error("[Create Admin] Error creating/updating admin:", error);
        process.exit(1);
    }
};

createAdmin();
