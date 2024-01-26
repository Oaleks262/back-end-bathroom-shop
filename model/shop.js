import mongoose from "mongoose";

const basketShopSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    item: {
        type: String,
    },
    quantity: {
        type: Number,
    },
    price: {
        type: Number,
    },
    total: {
        type: Number
    },
});

basketShopSchema.pre('save', function (next) {
    // Перерахунок total для кожного товару у корзині перед збереженням
    this.total = this.price * this.quantity;
    next();
});

const ShopSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    postOffice: {
        type: String,
        required: true,
    },
    numberPost: {
        type: String,
        required: true,
    },
    productItems: {
        type: [basketShopSchema],
        required: true,
    },
    position: {
        type: String,
        required: true,
    },
    ttn: {
        type: String,
    },
    totalAmount: {
        type: Number,
    },
});

ShopSchema.pre('save', function (next) {
    // Перерахунок загальної суми за всі продукти та товари у корзині перед збереженням
    const totalAmount = this.productItems.reduce((total, item) => total + item.total, 0);
    this.totalAmount = totalAmount;
    next();
});

export default mongoose.model('Shop', ShopSchema);
