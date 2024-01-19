import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
    fullNane: {
        type: String,
        required: true,
    },
    feedBack:{
        type: String,
        required: true,
        maxlength: 1000,
    }
    
    })
    
    export default mongoose.model('Feedback', FeedbackSchema);