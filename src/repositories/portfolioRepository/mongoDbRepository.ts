import {ConnectionStates} from 'mongoose';
import PortfolioModel from '../../db/mongodb/models/portfolio';
import connectToDbPromise, {getdbStatus} from '../../db/mongodb';
import { IPortfolioRepository } from ".";
import IPortfolio, { IRawPortfolio } from '../../entities/portfolio';

class MongoDbPortfolioRepository implements IPortfolioRepository {
    private readonly _portfolioModel = PortfolioModel;

    private connectToDb() {
        return  getdbStatus() === ConnectionStates.connected
            ? Promise.resolve()
            : connectToDbPromise;
    }
    //@ts-ignore ts doesn't get the correct type for position instrument_type because of mongoDB schema
    async getPortfolio(id: IPortfolio["id"]) {
        await this.connectToDb();
        const portfolio =  await this._portfolioModel.findById(id);
        if (!portfolio) {
            return null;
        }
        portfolio.id = portfolio._id.toString();
        return portfolio;
    }

    async savePortfolio(id: IPortfolio["id"], portfolio: IRawPortfolio) {
        await this.connectToDb();
        this._portfolioModel.create({
            ...portfolio,
            _id: id,
        })
    };
}

export default MongoDbPortfolioRepository;
