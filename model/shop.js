import mongoose from "mongoose";


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
    productItem: {
        type: Array,
        required: true,
    }

})
export default mongoose.model('Shop', ShopSchema);