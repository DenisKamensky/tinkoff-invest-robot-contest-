import mongoose from "mongoose";

export const schema = new mongoose.Schema({
    _id: String,
    positions: [{
        figi: String,
        instrument_type: String,
        quantity: Number,
        average_position_price: String,
        expected_yield: Number,
        current_nkd: Number,
        average_position_price_pt: Number,
        current_price: Number,
        average_position_price_fifo: Number,
        quantity_lots: Number
    }],
})


const PortfolioModel = mongoose.model('portfolio', schema);

export default PortfolioModel;
