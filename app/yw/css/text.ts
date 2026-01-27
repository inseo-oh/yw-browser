import { CSSSyntaxError, TokenStream } from "./syntax";

export type TextTransform = {
    caseTransform: TextCaseTransform | null;
    fullWidth: boolean;
    fullSizeKana: boolean;
};

export type TextCaseTransform = "capitalize" | "lowercase" | "uppercase";

export function parseTextTransform(
    ts: TokenStream,
    _args: void,
): TextTransform | null {
    const tk = ts.nextToken();
    if (tk.type !== "ident") {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    if (tk.value === "none") {
        return null;
    }
    let caseTransform: null | TextCaseTransform = null;
    let fullWidth: null | boolean = null;
    let fullSizeKana: null | boolean = null;
    while (
        caseTransform === null ||
        fullWidth === null ||
        fullSizeKana === null
    ) {
        const tk = ts.nextToken();
        if (tk.type !== "ident") {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        let gotSomething = false;
        if (caseTransform === null) {
            switch (tk.value) {
                case "capitalize":
                case "lowercase":
                case "uppercase":
                    caseTransform = tk.value;
                    gotSomething = true;
                    break;
            }
        }
        // TODO: Support full-width and full-size-kana
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}

export function applyTextTransform(tt: TextTransform, text: string): string {
    switch (tt.caseTransform) {
        case "capitalize":
            return text[0].toUpperCase() + text.substring(1);
        case "uppercase":
            return text.toUpperCase();
        case "lowercase":
            return text.toLocaleLowerCase();
        case null:
            return text;
    }
}
