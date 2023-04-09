export enum IInstrument {
    SHARE = 'share',
    BOND = 'bond',
    ETF = 'etf',
    CURRENCY = 'currency',
}

export interface IPosition {
    figi: string,
    instrument_type: IInstrument,
    quantity: number,
    average_position_price:  number,
    expected_yield:  number,
    current_nkd: number,
    average_position_price_pt:  number,
    current_price:  number,
    average_position_price_fifo:  number,
    quantity_lots:  number,

}

interface IPortfolio {
    id: string,
    positions: Array<IPosition>,
    [k: string]: any,
}

export type IRawPortfolio = Omit<IPortfolio, 'id'>;
export default IPortfolio;
