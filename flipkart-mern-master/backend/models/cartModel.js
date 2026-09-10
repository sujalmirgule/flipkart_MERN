const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    cartItems: [
        {
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product',
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            seller: {
                type: String,
                default: "RetailNet",
            },
            price: {
                type: Number,
                required: true,
            },
            cuttedPrice: {
                type: Number,
            },
            image: {
                type: String,
                required: true,
            },
            stock: {
                type: Number,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1,
            },
        }
    ]
}, {
    timestamps: true,
});

module.exports = mongoose.model('Cart', cartSchema);
