import IPortfolio, { IRawPortfolio } from "../../entities/portfolio";

export interface IPortfolioRepository {
    getPortfolio: (id: IPortfolio['id']) => Promise<IPortfolio | null>;
    savePortfolio: (id: IPortfolio['id'], portfolio: IRawPortfolio) => void;
};
