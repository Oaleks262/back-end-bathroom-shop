import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    feedback:{
        type: String,
        required: true,
        maxlength: 1000,
    },
    date: { type: Date, 
        default: Date.now 
    },
    
    })
    
    export default mongoose.model('Feedback', FeedbackSchema);