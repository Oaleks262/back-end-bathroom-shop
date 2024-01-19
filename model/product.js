import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
avatarUrl: String,
itemProduct:{
    type:String,
    required: true,
},
titleProduct:{
    type: String,
    required: true,
    maxlength: 200,
},
aboutProduct:{ 
    type: String,
    required: true,
    maxlength: 1000,
},
priceProduct:{
    type:Number,
    required: true,
},

})

export default mongoose.model('Product', ProductSchema);