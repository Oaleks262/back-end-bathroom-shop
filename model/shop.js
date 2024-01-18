import mongoose from "mongoose";

const basketShopSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
});

// Додавання middleware для обчислення загальної ціни перед збереженням
basketShopSchema.pre('save', function (next) {
    // Обчислення загальної ціни
    this.total = this.quantity * this.price;
    next();
});

const ShopSchema = new mongoose.Schema({

    firstName:{
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: Number,
        required:true,
    },
    city: {
        type: String,
        required: true,
    },
    postOffice: {
        type: String,
        required: true,
    },
    numberPost:{
        type:Number,
        required: true,
    },
    productItems: {
        type: [basketShopSchema], 
        required: true,
    },
    acrivePosition: {
        type: String,
        required: true,
    }

})
export default mongoose.model('Shop', ShopSchema);