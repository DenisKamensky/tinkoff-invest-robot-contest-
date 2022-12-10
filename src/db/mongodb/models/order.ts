import mongoose from "mongoose";

export const schema = new mongoose.Schema({
    side: {
        type: String,
        required: [true, 'side is Required'],
    },
    _id: String,
    time: {
        type: Number,
        required: [true, 'time is Required'],
    },
    price: {
        type: String || Number,
    },
    pair: {
        type: String,
        required: [true, 'pair is Required'],
    },
    userId: {
        type: String,
        required: [true, 'userId is Required']
    },
    quantity: Number,
})


const OrderModel = mongoose.model('order', schema);

export default OrderModel;
