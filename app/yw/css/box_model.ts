import { CSSSyntaxError, TokenStream } from "./syntax";
import {
    Length,
    LengthParseArgs,
    parseLengthOrPercentage,
    Percentage,
} from "./value";

// https://www.w3.org/TR/css-box-3/#margin-physical
export type Margin = Length | Percentage | "auto";

export function parseMargin(ts: TokenStream, _args: void): Margin {
    const tk = ts.nextToken();
    if (tk.type === "ident") {
        ts.consumeToken();
        switch (tk.value) {
            case "auto":
                return tk.value;
            default:
                throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
    }
    return parseLengthOrPercentage(ts, {});
}

export type Padding = Length | Percentage;

export function parsePadding(ts: TokenStream, _args: void): Padding {
    return parseLengthOrPercentage(ts, {
        allowZeroShorthand: true,
        allowNegative: false,
    });
}
