import mongoose from "mongoose";

export const schema = new mongoose.Schema({
    time: {
        type: Number,
        required: [true, 'time is Required'],
    },
    pair: {
        type: String,
        required: [true, 'pair is Required'],
    },
    userId: {
        type: String,
        required: [true, 'userId is Required']
    }
})

const LastTade = mongoose.model('lastTrade', schema);

export default LastTade;
