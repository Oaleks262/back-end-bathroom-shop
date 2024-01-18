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
        set: function (value) {
            return this.quantity * this.price;
        },
    }
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
        type: String,
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
        type: String,
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