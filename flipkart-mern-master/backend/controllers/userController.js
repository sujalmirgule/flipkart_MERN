const User = require('../models/userModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const sendToken = require('../utils/sendToken');
const ErrorHandler = require('../utils/errorHandler');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const cloudinary = require('cloudinary');

const { saveBase64Image } = require('../utils/upload');

// Register User
exports.registerUser = asyncErrorHandler(async (req, res, next) => {
    const { name, email, gender, password } = req.body;

    let avatarData = {
        public_id: "default_avatar",
        url: "https://via.placeholder.com/150",
    };

    if (req.file) {
        avatarData = {
            public_id: req.file.filename,
            url: `/uploads/avatars/${req.file.filename}`,
        };
    } else if (req.body.avatar && typeof req.body.avatar === 'string' && req.body.avatar.trim() !== '' && req.body.avatar !== 'preview.png') {
        const saved = saveBase64Image(req.body.avatar, 'avatars');
        if (saved) avatarData = saved;
    }

    const user = await User.create({
        name,
        email,
        gender,
        password,
        avatar: avatarData,
    });

    sendToken(user, 201, res);
});

// Login User
exports.loginUser = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return next(new ErrorHandler("Please Enter Email And Password", 400));
    }

    const user = await User.findOne({ email}).select("+password");

    if(!user) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Invalid Email or Password", 401));
    }

    sendToken(user, 201, res);
});

// Logout User
exports.logoutUser = asyncErrorHandler(async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message: "Logged Out",
    });
});

// Get User Details
exports.getUserDetails = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Forgot Password
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
    
    const user = await User.findOne({email: req.body.email});

    if(!user) {
        return next(new ErrorHandler("User Not Found", 404));
    }

    const resetToken = await user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`;
    const resetPasswordUrl = `https://${req.get("host")}/password/reset/${resetToken}`;

    // const message = `Your password reset token is : \n\n ${resetPasswordUrl}`;

    try {
        await sendEmail({
            email: user.email,
            templateId: process.env.SENDGRID_RESET_TEMPLATEID,
            data: {
                reset_url: resetPasswordUrl
            }
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`,
        });

    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });
        return next(new ErrorHandler(error.message, 500))
    }
});

// Reset Password
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {

    // create hash token
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({ 
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if(!user) {
        return next(new ErrorHandler("Invalid reset password token", 404));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    sendToken(user, 200, res);
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Old Password is Invalid", 400));
    }

    user.password = req.body.newPassword;
    await user.save();
    sendToken(user, 201, res);
});

// Update User Profile
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    }

    if (req.body.gender) {
        newUserData.gender = req.body.gender;
    }

    if (req.file) {
        newUserData.avatar = {
            public_id: req.file.filename,
            url: `/uploads/avatars/${req.file.filename}`,
        };
    } else if (req.body.avatar && typeof req.body.avatar === 'string' && req.body.avatar.trim() !== "") {
        const saved = saveBase64Image(req.body.avatar, 'avatars');
        if (saved) newUserData.avatar = saved;
    }

    await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// ADMIN DASHBOARD

// Get All Users --ADMIN
exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {

    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});

// Get Single User Details --ADMIN
exports.getSingleUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        user,
    });
});

// Update User Role --ADMIN
exports.updateUserRole = asyncErrorHandler(async (req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        gender: req.body.gender,
        role: req.body.role,
    }

    await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});

// Delete Role --ADMIN
exports.deleteUser = asyncErrorHandler(async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return next(new ErrorHandler(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    await user.deleteOne();

    res.status(200).json({
        success: true
    });
});

// Get User Addresses
exports.getUserAddresses = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    res.status(200).json({
        success: true,
        addresses: user.addresses || [],
    });
});

// Add New Address
exports.addAddress = asyncErrorHandler(async (req, res, next) => {
    const { name, phoneNo, pincode, address, city, state, landmark, addressType, isDefault } = req.body;

    if (!name || !phoneNo || !pincode || !address || !city || !state) {
        return next(new ErrorHandler("Please fill all required address fields", 400));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    const shouldBeDefault = Boolean(isDefault) || user.addresses.length === 0;

    if (shouldBeDefault) {
        user.addresses.forEach((addr) => {
            addr.isDefault = false;
        });
    }

    user.addresses.push({
        name,
        phoneNo,
        pincode,
        address,
        city,
        state,
        landmark: landmark || "",
        addressType: addressType || "Home",
        isDefault: shouldBeDefault,
    });

    await user.save({ validateBeforeSave: false });

    res.status(201).json({
        success: true,
        addresses: user.addresses,
    });
});

// Update Address
exports.updateAddress = asyncErrorHandler(async (req, res, next) => {
    const { name, phoneNo, pincode, address, city, state, landmark, addressType, isDefault } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    const addr = user.addresses.id(req.params.id);
    if (!addr) {
        return next(new ErrorHandler("Address not found", 404));
    }

    if (isDefault) {
        user.addresses.forEach((a) => {
            a.isDefault = false;
        });
    }

    if (name !== undefined) addr.name = name;
    if (phoneNo !== undefined) addr.phoneNo = phoneNo;
    if (pincode !== undefined) addr.pincode = pincode;
    if (address !== undefined) addr.address = address;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (landmark !== undefined) addr.landmark = landmark;
    if (addressType !== undefined) addr.addressType = addressType;
    if (isDefault !== undefined) addr.isDefault = Boolean(isDefault);

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        addresses: user.addresses,
    });
});

// Delete Address
exports.deleteAddress = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    const addressIndex = user.addresses.findIndex((a) => a._id.toString() === req.params.id);
    if (addressIndex === -1) {
        return next(new ErrorHandler("Address not found", 404));
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    if (wasDefault && user.addresses.length > 0) {
        user.addresses[0].isDefault = true;
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        addresses: user.addresses,
    });
});

// Set Default Address
exports.setDefaultAddress = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    let found = false;
    user.addresses.forEach((a) => {
        if (a._id.toString() === req.params.id) {
            a.isDefault = true;
            found = true;
        } else {
            a.isDefault = false;
        }
    });

    if (!found) {
        return next(new ErrorHandler("Address not found", 404));
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        addresses: user.addresses,
    });
});