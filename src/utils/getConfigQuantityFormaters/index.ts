import {get} from "underscore";

import IPair from "../../entities/pair";

export default (pair: IPair): (quantity: number) => number => {
    const defaultCb = (quantity) => quantity;
    let resultFn = get(pair, ["quantityFormater"], defaultCb);
    try {
        if (typeof resultFn === "string") {
            // tslint:disable-next-line:no-eval
            const configFn = eval(resultFn);
            resultFn = typeof configFn === "function"
                ? configFn
                : defaultCb;
        }
    // tslint:disable-next-line:no-empty
    } catch (err) {

    } finally {
        // tslint:disable-next-line:no-unsafe-finally
        return resultFn;
    }
};
