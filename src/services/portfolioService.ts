import IPortfolio, { IRawPortfolio } from "../entities/portfolio";
import { IPortfolioRepository } from "../repositories/portfolioRepository";

class PortfolioService {
    private readonly _portfolioRepository: IPortfolioRepository;
    constructor (portfolioRepository: IPortfolioRepository) {
        this._portfolioRepository = portfolioRepository;
    }

    getPortfolio(id: IPortfolio["id"]) {
        return this._portfolioRepository.getPortfolio(id);
    }

    savePortfolio(id: IPortfolio["id"], portfolio: IRawPortfolio) {
        return this._portfolioRepository.savePortfolio(id, portfolio);
    }
}

export default PortfolioService;
