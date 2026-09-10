const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
    upiId: {
        type: String,
        trim: true,
        default: "flipkart@upi"
    },
    merchantName: {
        type: String,
        trim: true,
        default: "Flipkart Store"
    },
    upiEnabled: {
        type: Boolean,
        default: true
    },
    qrPaymentEnabled: {
        type: Boolean,
        default: true
    },
    paytmEnabled: {
        type: Boolean,
        default: true
    },
    phonePeEnabled: {
        type: Boolean,
        default: true
    },
    phonepeEnabled: {
        type: Boolean,
        default: true
    },
    googlePayEnabled: {
        type: Boolean,
        default: true
    },
    cashOnDeliveryEnabled: {
        type: Boolean,
        default: true
    },
    otherUpiEnabled: {
        type: Boolean,
        default: true
    },
    paymentMode: {
        type: String,
        enum: ["development", "production"],
        default: "development"
    }
}, {
    timestamps: true
});

// Singleton helper: fetches existing settings or initializes default settings
paymentSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            upiId: "flipkart@upi",
            merchantName: "Flipkart Store",
            upiEnabled: true,
            qrPaymentEnabled: true,
            paytmEnabled: true,
            phonePeEnabled: true,
            phonepeEnabled: true,
            googlePayEnabled: true,
            otherUpiEnabled: true,
            cashOnDeliveryEnabled: true,
            paymentMode: "development"
        });
    } else {
        // Ensure new fields exist on older documents
        let modified = false;
        if (settings.qrPaymentEnabled === undefined) {
            settings.qrPaymentEnabled = true;
            modified = true;
        }
        if (settings.cashOnDeliveryEnabled === undefined) {
            settings.cashOnDeliveryEnabled = true;
            modified = true;
        }
        if (settings.phonePeEnabled === undefined) {
            settings.phonePeEnabled = settings.phonepeEnabled !== undefined ? settings.phonepeEnabled : true;
            modified = true;
        }
        if (settings.otherUpiEnabled === undefined) {
            settings.otherUpiEnabled = true;
            modified = true;
        }
        if (!settings.paymentMode) {
            settings.paymentMode = "development";
            modified = true;
        }
        if (modified) {
            await settings.save();
        }
    }
    return settings;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);

