import mongoose, {ConnectionStates} from 'mongoose';

declare var logger;

const connectToDbPromise = mongoose.connect(process.env.MONGO_DB_URL).then(() => logger.log({
    level: "info",
    message: 'mongoDB successfully connected'
}));

export const STATUS = ConnectionStates;
export const getdbStatus = () => mongoose.connection.readyState;
export default connectToDbPromise;
