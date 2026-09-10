const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    shippingInfo: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        phoneNo: {
            type: Number,
            required: true
        },
    },
    orderItems: [
        {
            name: {
                type: String,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            image: {
                type: String,
                required: true
            },
            product: {
                type: mongoose.Schema.ObjectId,
                ref: "Product",
                required: true
            },
        },
    ],
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true
    },
    payment: {
        method: {
            type: String,
            default: "UPI"
        },
        provider: {
            type: String,
            default: "UPI"
        },
        status: {
            type: String,
            enum: [
                "PENDING",
                "PROCESSING",
                "SUCCESS",
                "FAILED",
                "CANCELLED"
            ],
            default: "PENDING"
        },
        transactionId: String,
        gatewayOrderId: String,
        gatewayPaymentId: String,
        paidAt: Date,
        amount: Number
    },
    paymentInfo: {
        id: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            default: "Pending"
        },
        method: {
            type: String,
            default: "UPI"
        }
    },
    paidAt: {
        type: Date,
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    orderStatus: {
        type: String,
        required: true,
        default: "Processing",
    },
    deliveredAt: Date,
    shippedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
});

orderSchema.pre('save', function (next) {
    if (this.payment) {
        if (!this.paymentInfo) this.paymentInfo = {};
        if (this.payment.transactionId && !this.paymentInfo.id) {
            this.paymentInfo.id = this.payment.transactionId;
        }
        if (this.payment.status) {
            this.paymentInfo.status = this.payment.status === "SUCCESS" ? "Paid" : (this.payment.status === "FAILED" ? "Failed" : "Pending");
        }
        if (this.payment.method) {
            this.paymentInfo.method = this.payment.method;
        }
    }
    if (this.paymentInfo && (!this.payment || !this.payment.transactionId)) {
        if (!this.payment) this.payment = {};
        if (this.paymentInfo.id) this.payment.transactionId = this.paymentInfo.id;
        if (this.paymentInfo.status) {
            const upStatus = String(this.paymentInfo.status).toUpperCase();
            this.payment.status = upStatus === "PAID" ? "SUCCESS" : (upStatus === "FAILED" ? "FAILED" : "PENDING");
        }
        if (this.paymentInfo.method) this.payment.method = this.paymentInfo.method;
    }
    next();
});

module.exports = mongoose.model("Order", orderSchema);