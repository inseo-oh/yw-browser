import {
    isAsciiAlphabet,
    isAsciiDigit,
    TextReader,
    normalizeCodepoint,
    isAsciiHexDigit,
    toAsciiLowercase,
} from "../utility";
import { $MediaList, $Stylesheet } from "./om";

export type NumericValue = { type: "integer" | "number"; num: number };
export type Token =
    | { type: "ident"; value: string }
    | { type: "function"; value: string }
    | { type: "at-keyword"; value: string }
    | { type: "hash"; subType: "id" | "unrestricted"; value: string }
    | { type: "string"; value: string }
    | { type: "bad-string" }
    | { type: "url"; value: string }
    | { type: "bad-url" }
    | { type: "delim"; value: string }
    | { type: "number"; value: NumericValue }
    | { type: "percentage"; value: NumericValue }
    | { type: "dimension"; value: NumericValue; unit: string }
    | { type: "whitespace" }
    | { type: "CDO" }
    | { type: "CDC" }
    | { type: "colon" }
    | { type: "semicolon" }
    | { type: "comma" }
    | { type: "[" }
    | { type: "]" }
    | { type: "(" }
    | { type: ")" }
    | { type: "{" }
    | { type: "}" }
    | { type: "EOF" };

// https://www.w3.org/TR/css-syntax-3/#at-rule
export type AtRule = {
    type: "ast-at-rule";
    name: string;
    prelude: ComponentValue[];
    value: ComponentValue[];
};
// https://www.w3.org/TR/css-syntax-3/#qualified-rule
export type QualifiedRule = {
    type: "ast-qualified-rule";
    prelude: ComponentValue[];
    value: ComponentValue[];
};
// https://www.w3.org/TR/css-syntax-3/#declaration
export type Declaration = {
    type: "ast-declaration";
    name: string;
    value: ComponentValue[];
    important: boolean;
};
// https://www.w3.org/TR/css-syntax-3/#component-value
type ComponentValue = PreservedToken | Function | SimpleBlock;
// https://www.w3.org/TR/css-syntax-3/#preserved-tokens
type PreservedToken = Exclude<
    Token,
    | { type: "function"; value: string }
    | { type: "{" }
    | { type: "(" }
    | { type: "[" }
>;
// https://www.w3.org/TR/css-syntax-3/#function
type Function = { type: "ast-function"; name: string; value: ComponentValue[] };

// https://www.w3.org/TR/css-syntax-3/#simple-block
type SimpleBlock = {
    type: "ast-simple-block";
    subType: "square" | "curly" | "paren";
    value: ComponentValue[];
};

function tokenize(str: string): Token[] {
    let tkr = new Tokenizer(str);
    let tokens = [];
    while (true) {
        let token = tkr.consumeToken();
        if (token.type === "EOF") {
            break;
        }
        tokens.push(token);
    }
    return tokens;
}

class Tokenizer {
    tr: TextReader;

    constructor(str: string) {
        this.tr = new TextReader(str);
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-token
    consumeToken(): Token {
        this.consumeComments();
        let cursorBeforeToken = this.tr.cursor;
        const chr = this.tr.consumeChars(1);
        switch (chr) {
            case '\"':
                return this.consumeStringToken(chr);
            case "#": {
                let isHash = false;
                if (isIdentCodePoint(this.tr.nextChars(1))) {
                    isHash = true;
                } else if (this.streamStartsWithValidEscape()) {
                    isHash = true;
                }
                if (isHash) {
                    let subType: "id" | "unrestricted";
                    if (startsWithIdentSequence(this.tr.nextChars(3))) {
                        subType = "id";
                    } else {
                        subType = "unrestricted";
                    }
                    let ident = this.consumeIdentSequence();
                    return { type: "hash", subType, value: ident };
                } else {
                    return { type: "delim", value: chr };
                }
            }
            case "\'":
                return this.consumeStringToken(chr);
            case "(":
                return { type: "(" };
            case ")":
                return { type: ")" };
            case "+":
                if (this.streamStartsWithNumber()) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeNumericToken();
                } else {
                    return { type: "delim", value: chr };
                }
            case ",":
                return { type: "comma" };
            case "-":
                if (this.streamStartsWithNumber()) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeNumericToken();
                } else if (this.tr.nextChars(2) === ">") {
                    this.tr.consumeChars(2);
                    return { type: "CDC" };
                } else if (this.streamStartsWithIdentSequence()) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeIdentLikeToken();
                } else {
                    return { type: "delim", value: chr };
                }
            case ".":
                if (this.streamStartsWithNumber()) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeNumericToken();
                } else {
                    return { type: "delim", value: chr };
                }
            case ":":
                return { type: "colon" };
            case ";":
                return { type: "semicolon" };
            case "<":
                if (this.tr.nextChars(3) == "!--") {
                    this.tr.consumeChars(3);
                    return { type: "CDO" };
                } else {
                    return { type: "delim", value: chr };
                }
            case "@":
                if (this.streamStartsWithIdentSequence()) {
                    return {
                        type: "at-keyword",
                        value: this.consumeIdentSequence(),
                    };
                } else {
                    return { type: "delim", value: chr };
                }
            case "[":
                return { type: "[" };
            case "\\":
                if (this.streamStartsWithValidEscape()) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeIdentLikeToken();
                } else {
                    return { type: "delim", value: chr };
                }
            case "]":
                return { type: "]" };
            case "{":
                return { type: "{" };
            case "}":
                return { type: "}" };
            case "":
                return { type: "EOF" };
            default:
                if (isWhitespace(chr)) {
                    while (isWhitespace(this.tr.nextChars(1))) {
                        this.tr.consumeChars(1);
                    }
                    return { type: "whitespace" };
                } else if (isAsciiDigit(chr)) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeNumericToken();
                } else if (isIdentStartCodePoint(chr)) {
                    this.tr.cursor = cursorBeforeToken;
                    return this.consumeIdentLikeToken();
                } else {
                    return { type: "delim", value: chr };
                }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-comment
    consumeComments() {
        let endFound = false;

        while (!this.tr.isEof) {
            if (this.tr.nextChars(2) !== "/*") {
                return;
            }
            this.tr.consumeChars(2);
            while (!this.tr.isEof) {
                if (this.tr.nextChars(2) === "*/") {
                    this.tr.consumeChars(2);
                    endFound = true;
                    break;
                }
                this.tr.consumeChars(1);
            }
            if (endFound) {
                continue;
            }
            // PARSE ERROR
            return;
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-numeric-token
    consumeNumericToken(): Token {
        let number = this.consumeNumber();
        if (this.streamStartsWithIdentSequence()) {
            // S1 --------------------------------------------------------------
            let dimValue = number;

            // S2 --------------------------------------------------------------
            let dimUnit = this.consumeIdentSequence();

            // S3 --------------------------------------------------------------
            return { type: "dimension", value: dimValue, unit: dimUnit };
        } else if (this.tr.nextChars(1) === "%") {
            this.tr.consumeChars(1);
            return { type: "percentage", value: number };
        } else {
            return { type: "number", value: number };
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-ident-like-token
    consumeIdentLikeToken(): Token {
        let string = this.consumeIdentSequence();

        if (
            toAsciiLowercase(string) === "url" &&
            this.tr.nextChars(1) === "("
        ) {
            this.tr.consumeChars(1);
            while (isWhitespace(this.tr.nextChars(1))) {
                this.tr.consumeChars(1);
            }
            let isFn = false;
            if (this.tr.nextChars(1) === '"' || this.tr.nextChars(1) === "\'") {
                isFn = true;
            } else if (isWhitespace(this.tr.nextChars(1))) {
                const nextChar = this.tr.nextChars(2).substring(1);
                if (nextChar === '"' || nextChar === "\'") {
                    isFn = true;
                }
            }
            if (isFn) {
                return { type: "function", value: string };
            } else {
                return this.consumeUrlToken();
            }
        } else if (this.tr.nextChars(1) === "(") {
            this.tr.consumeChars(1);
            return { type: "function", value: string };
        } else {
            return { type: "ident", value: string };
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-string-token
    // NOTE: This assumes that the initial " or ' has already been consumed.
    consumeStringToken(openChar: '"' | "\'"): Token {
        let strValue = "";

        while (true) {
            let cursorBeforeChar = this.tr.cursor;
            const chr = this.tr.consumeChars(1);
            switch (chr) {
                case "":
                    // PARSE ERROR
                    return { type: "string", value: strValue };
                case "\n":
                    // PARSE ERROR
                    this.tr.cursor = cursorBeforeChar;
                    return { type: "bad-string" };
                case "\\":
                    if (this.tr.isEof) {
                        continue;
                    } else if (this.tr.nextChars(1) === "\n") {
                        this.tr.consumeChars(1);
                        continue;
                    } else {
                        strValue += this.consumeEscapedCodePoint();
                    }
                    break;
                default:
                    if (chr === openChar) {
                        // Closing char
                        break;
                    } else {
                        strValue += chr;
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-url-token
    // NOTE: This assumes that the initial "url(" has already been consumed.
    consumeUrlToken(): Token {
        // S1 ------------------------------------------------------------------
        let urlValue = "";

        // S2 ------------------------------------------------------------------
        while (isWhitespace(this.tr.nextChars(1))) {
            this.tr.consumeChars(1);
        }

        // S3 ------------------------------------------------------------------
        while (true) {
            const chr = this.tr.consumeChars(1);
            switch (chr) {
                case ")":
                    return { type: "url", value: urlValue };
                case '"':
                case "\'":
                case "(":
                    // PARSE ERROR
                    this.consumeRemnantsOfBadUrl();
                    return { type: "bad-url" };
                case "\\":
                    if (this.streamStartsWithValidEscape()) {
                        urlValue += this.consumeEscapedCodePoint();
                    } else {
                        // PARSE ERROR
                        this.consumeRemnantsOfBadUrl();
                        return { type: "bad-url" };
                    }
                case "":
                    // PARSE ERROR
                    return { type: "url", value: urlValue };
                default:
                    if (isWhitespace(chr)) {
                        while (isWhitespace(this.tr.nextChars(1))) {
                            this.tr.consumeChars(1);
                        }
                    } else if (isNonPrintable(chr)) {
                        // PARSE ERROR
                        this.consumeRemnantsOfBadUrl();
                        return { type: "bad-url" };
                    } else {
                        urlValue += chr;
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
    // NOTE: This assumes \ has been already consumed
    consumeEscapedCodePoint(): string {
        let hasHexDigit = false;
        let hexDigitVal = 0;
        let hexDigitCount = 0;

        if (this.tr.isEof) {
            // PARSE ERROR: Unexpected EOF
            return "\ufffd";
        }

        //https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
        while (true) {
            let chr = this.tr.nextChars(1);
            if (chr === "") {
                break;
            }
            if (6 <= hexDigitCount) {
                break;
            }
            let digit;
            if (isAsciiDigit(chr) || isAsciiHexDigit(chr)) {
                digit = parseInt(chr, 16);
            } else {
                break;
            }
            this.tr.consumeChars(1);
            hexDigitVal = hexDigitVal * 16 + digit;
            hasHexDigit = true;
            hexDigitCount += 1;
        }
        if (hasHexDigit) {
            return String.fromCodePoint(hexDigitVal);
        } else {
            return this.tr.consumeChars(1);
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape
    streamStartsWithValidEscape(): boolean {
        return startsWithValidEscape(this.tr.nextChars(2));
    }

    // https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence
    streamStartsWithIdentSequence(): boolean {
        return startsWithIdentSequence(this.tr.nextChars(3));
    }

    // https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-a-number
    streamStartsWithNumber(): boolean {
        return startsWithNumber(this.tr.nextChars(3));
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-name
    consumeIdentSequence(): string {
        let res = "";
        while (true) {
            if (this.streamStartsWithValidEscape()) {
                res += this.consumeEscapedCodePoint();
            } else if (isIdentCodePoint(this.tr.nextChars(1))) {
                res += this.tr.consumeChars(1);
            } else {
                break;
            }
        }
        return res;
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-number
    consumeNumber(): NumericValue {
        let repr = "";

        // S1 ------------------------------------------------------------------
        let isInteger = true;

        // S2 ------------------------------------------------------------------
        if (this.tr.nextChars(1) === "+" || this.tr.nextChars(1) === "-") {
            repr += this.tr.consumeChars(1);
        }

        // S3 ------------------------------------------------------------------
        while (this.tr.nextChars(1) !== "") {
            if (!isAsciiDigit(this.tr.nextChars(1))) {
                break;
            }
            repr += this.tr.consumeChars(1);
        }

        // S4 ------------------------------------------------------------------
        let nextChars = this.tr.nextChars(2);
        if (nextChars.startsWith(".") && isAsciiDigit(nextChars.charAt(1))) {
            // S4-1, S4-2 ------------------------------------------------------
            repr += this.tr.consumeChars(2);

            // S4-3 ------------------------------------------------------------
            isInteger = false;

            // S4-4 ------------------------------------------------------------
            while (isAsciiDigit(this.tr.nextChars(1))) {
                repr += this.tr.consumeChars(1);
            }
        }

        // S5 ------------------------------------------------------------------
        nextChars = this.tr.nextChars(3);
        if (
            (nextChars.startsWith("e") || nextChars.startsWith("E")) &&
            (((nextChars.charAt(1) === "-" || nextChars.charAt(1) === "+") &&
                isAsciiDigit(nextChars.charAt(2))) ||
                isAsciiDigit(nextChars.charAt(1)))
        ) {
            // S5-1, S5-2 ------------------------------------------------------
            if (isAsciiDigit(nextChars.charAt(1))) {
                repr += this.tr.consumeChars(2);
            } else {
                repr += this.tr.consumeChars(3);
            }

            // S5-3 ------------------------------------------------------------
            isInteger = false;

            // S5-4 ------------------------------------------------------------
            while (isAsciiDigit(this.tr.nextChars(1))) {
                repr += this.tr.consumeChars(1);
            }
        }

        // S6 ~ S7 -------------------------------------------------------------
        if (isInteger) {
            return { type: "integer", num: parseInt(repr) };
        } else {
            return { type: "number", num: parseFloat(repr) };
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-remnants-of-bad-url
    consumeRemnantsOfBadUrl() {
        while (true) {
            if (this.streamStartsWithValidEscape()) {
                this.consumeEscapedCodePoint();
            }
            switch (this.tr.nextChars(1)) {
                case ")":
                case "": {
                    this.tr.consumeChars(1);
                    return;
                }
            }
        }
    }
}

//https://www.w3.org/TR/css-syntax-3/#css-filter-code-points
function filterCodePoints(s: string): string {
    return s
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\u{000c}", "\n");
}

// https://www.w3.org/TR/css-syntax-3/#non-printable-code-point
function isNonPrintable(c: string | number): boolean {
    const [cp, chr] = normalizeCodepoint(c);
    return (
        cp <= 0x0008 ||
        chr === "\t" ||
        (0x000e <= cp && cp <= 0x001f) ||
        chr === "\x7f"
    );
}

// https://www.w3.org/TR/css-syntax-3/#whitespace
function isWhitespace(c: string | number): boolean {
    const [cp, chr] = normalizeCodepoint(c);
    return chr === "\n" || chr === "\t" || chr === " ";
}

//https://www.w3.org/TR/css-syntax-3/#ident-start-code-point
function isIdentStartCodePoint(c: string | number): boolean {
    const [cp, chr] = normalizeCodepoint(c);
    return isAsciiAlphabet(c) || 0x80 <= cp || chr === "_";
}

//https://www.w3.org/TR/css-syntax-3/#ident-code-point
function isIdentCodePoint(c: string | number): boolean {
    const [, chr] = normalizeCodepoint(c);
    return isIdentStartCodePoint(c) || isAsciiDigit(c) || chr === "-";
}

// https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape
function startsWithValidEscape(input: string): boolean {
    if (input[0] !== "\\") {
        return false;
    }
    if (input[1] === "\n") {
        return false;
    }
    return true;
}
//https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence
function startsWithIdentSequence(input: string): boolean {
    switch (input[0]) {
        case undefined:
            return false;
        case "-":
            if (1 < input.length && isIdentCodePoint(input[1])) {
                return true;
            } else {
                return (
                    2 < input.length && input[1] === "\\" && input[2] !== "\n"
                );
            }
        case "\\":
            return 1 < input.length && input[1] !== "\n";
        default:
            return isIdentStartCodePoint(input[0]);
    }
}

// https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-a-number
function startsWithNumber(input: string): boolean {
    switch (input[0]) {
        case undefined:
            return false;
        case "-":
        case "+":
            if (2 <= input.length && isAsciiDigit(input[1])) {
                return true;
            } else {
                return (
                    3 <= input.length &&
                    input[1] === "." &&
                    isAsciiDigit(input[2])
                );
            }
        case "\\":
            return 1 < input.length && input[1] !== "\n";
        default:
            return isIdentStartCodePoint(input[0]);
    }
}

export class CSSSyntaxError extends Error {
    constructor(nearToken: Token | ComponentValue) {
        super(`Syntax error occured near token ${nearToken}`);
    }
}

// https://www.w3.org/TR/css-syntax-3/#normalize-into-a-token-stream
function normalizeIntoTokenStream(input: Token[] | string): TokenStream {
    let tokens;
    if (input instanceof Array) {
        tokens = input;
    } else {
        tokens = tokenize(input);
    }
    return new TokenStream(tokens);
}

export type Parser<ParseArgs, Result> = (
    ts: TokenStream,
    args: ParseArgs,
) => Result;

// https://www.w3.org/TR/css-syntax-3/#css-parse-something-according-to-a-css-grammar
export function parse<ParseArgs, Result>(
    input: Token[] | string,
    parser: Parser<ParseArgs, Result>,
    args: ParseArgs,
): Result {
    // S1 ----------------------------------------------------------------------
    const normalized = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    let cvls = parseListOfComponentValues(input);
    // S3 ----------------------------------------------------------------------
    return parser(new TokenStream(cvls), args);
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-stylesheet
export function parse_stylesheet(
    input: Token[] | string,
    url: string | null,
): $Stylesheet {
    // S1 ----------------------------------------------------------------------
    // NOTE: This assumes we already have decoded string.
    //       For byte streams, there's another variant of this function.
    // S2 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S3 ----------------------------------------------------------------------
    let stylesheet = new $Stylesheet({
        location: url,
        parentStylesheet: null,
        ownerNode: null,
        ownerRule: null,
        media: new $MediaList(),
        title: "",
        alternateFlag: false,
        originCleanFlag: false,
        constructedFlag: false,
        constructorDocument: null,
    });
    // S4 ----------------------------------------------------------------------
    stylesheet.rules = ts.consumeListOfRules(true);
    // S5 ----------------------------------------------------------------------
    return stylesheet;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-rules
export function parseListOfRules(
    input: Token[] | string,
): (AtRule | QualifiedRule)[] {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    let rules = ts.consumeListOfRules(false);
    // S3 ----------------------------------------------------------------------
    return rules;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-rule
export function parseRule(input: Token[] | string): AtRule | QualifiedRule {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    ts.skipWhitespaces();
    // S3 ----------------------------------------------------------------------
    let rule;
    let nextToken = ts.nextToken();
    switch (nextToken.type) {
        case "EOF":
            throw new CSSSyntaxError(ts.nextToken());
        case "at-keyword":
            rule = ts.consumeAtRule(nextToken.value);
            break;
        default: {
            const tempRule = ts.consumeQualifiedRule();
            if (tempRule === null) {
                throw new CSSSyntaxError(ts.nextToken());
            }
            rule = tempRule;
        }
    }
    // S4 ----------------------------------------------------------------------
    ts.skipWhitespaces();
    // S5 ----------------------------------------------------------------------
    if (ts.nextToken().type !== "EOF") {
        throw new CSSSyntaxError(ts.nextToken());
    }
    return rule;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-declaration
export function parseDeclaration(input: Token[] | string): Declaration {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    ts.skipWhitespaces();
    // S3 ----------------------------------------------------------------------
    if (ts.nextToken().type !== "ident") {
        throw new CSSSyntaxError(ts.nextToken());
    }
    // S4 ----------------------------------------------------------------------
    let decl = ts.consumeDeclaration();
    if (decl === null) {
        throw new CSSSyntaxError(ts.prevOrFirstToken());
    }
    return decl;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-style-blocks-contents
export function parseStyleBlockContents(
    input: Token[] | string,
): (Declaration | AtRule | QualifiedRule)[] {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    return ts.consumeStyleBlockContents();
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-declarations
export function parseListOfDeclarations(
    input: Token[] | string,
): (Declaration | AtRule)[] {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    return ts.consumeListOfDeclarations();
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-component-value
export function parseComponentValue(input: Token[] | string): ComponentValue {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    ts.skipWhitespaces();
    // S3 ----------------------------------------------------------------------
    if (ts.nextToken().type === "EOF") {
        throw new CSSSyntaxError(ts.nextToken());
    }
    // S4 ----------------------------------------------------------------------
    let value = ts.consumeComponentValue();
    // S5 ----------------------------------------------------------------------
    ts.skipWhitespaces();
    // S6 ----------------------------------------------------------------------
    if (ts.nextToken().type !== "EOF") {
        throw new CSSSyntaxError(ts.nextToken());
    }
    return value;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-component-values
export function parseListOfComponentValues(
    input: Token[] | string,
): ComponentValue[] {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ------------------------------------------------------------------
    let list = [];
    while (true) {
        const cv = ts.consumeComponentValue();
        if (cv.type === "EOF") {
            break;
        }
        list.push(cv);
    }
    return list;
}

// https://www.w3.org/TR/css-syntax-3/#parse-a-comma-separated-list-of-component-values
export function parseCommaSeparatedListOfComponentValues(
    input: Token[] | string,
): ComponentValue[][] {
    // S1 ----------------------------------------------------------------------
    let ts = normalizeIntoTokenStream(input);
    // S2 ----------------------------------------------------------------------
    let cvls = [];
    while (true) {
        // S3
        let list = [];
        let lastWasComma = false;
        loop: while (true) {
            const cv = ts.consumeComponentValue();
            switch (cv.type) {
                case "EOF":
                    break loop;
                case "comma":
                    lastWasComma = true;
                    break loop;
                default:
                    list.push(cv);
                    break;
            }
        }
        cvls.push(list);
        if (!lastWasComma) {
            break;
        }
    }
    // S4 ----------------------------------------------------------------------
    return cvls;
}

export class TokenStream {
    tokens: (Token | ComponentValue)[];
    cursor: number = 0;

    constructor(tokens: (Token | ComponentValue)[]) {
        this.tokens = tokens;
    }

    isEnd(): boolean {
        return this.tokens.length <= this.cursor;
    }
    prevOrFirstToken(): Token | ComponentValue {
        if (this.cursor == 0) {
            return this.tokens[this.cursor];
        } else {
            return this.tokens[this.cursor - 1];
        }
    }
    nextToken(): Token | ComponentValue {
        return this.tokens[this.cursor];
    }
    consumeToken(): Token | ComponentValue {
        let res = this.nextToken();
        this.cursor++;
        return res;
    }
    skipWhitespaces() {
        while (this.nextToken().type !== "whitespace") {
            this.consumeToken();
        }
    }

    // https://www.w3.org/TR/css-values-4/#mult-comma
    parseCommaSeparatedRepeation<ParseArgs, Result>(
        minRepeats: number,
        maxRepeats: number | null,
        args: ParseArgs,
        parser: Parser<ParseArgs, Result>,
    ): Result[] {
        let res = [];
        while (true) {
            let cursorBeforeToken = this.cursor;
            let v;
            try {
                v = parser(this, args);
            } catch (e) {
                if (e instanceof CSSSyntaxError) {
                    if (res.length !== 0) {
                        // We encountered an error after ','
                        throw new CSSSyntaxError(this.prevOrFirstToken());
                    }
                    this.cursor = cursorBeforeToken;
                    break;
                } else {
                    throw e;
                }
            }
            res.push(v);
            if (maxRepeats !== null && maxRepeats <= res.length) {
                break;
            }
            this.skipWhitespaces();
            if (this.nextToken().type !== "comma") {
                break;
            }
            this.consumeToken();
        }
        if (res.length < minRepeats) {
            throw new CSSSyntaxError(this.nextToken());
        }
        return res;
    }

    // https://www.w3.org/TR/css-values-4/#mult-num-range
    parseRepeation<ParseArgs, Result>(
        minRepeats: number,
        maxRepeats: number | null,
        args: ParseArgs,
        parser: Parser<ParseArgs, Result>,
    ): Result[] {
        let res = [];
        while (true) {
            let cursorBeforeToken = this.cursor;
            let v;
            try {
                v = parser(this, args);
            } catch (e) {
                if (e instanceof CSSSyntaxError) {
                    this.cursor = cursorBeforeToken;
                    break;
                } else {
                    throw e;
                }
            }
            res.push(v);
            if (maxRepeats !== null && maxRepeats <= res.length) {
                break;
            }
            this.skipWhitespaces();
        }
        if (res.length < minRepeats) {
            throw new CSSSyntaxError(this.nextToken());
        }
        return res;
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-list-of-rules
    consumeListOfRules(topLevelFlag: boolean): (AtRule | QualifiedRule)[] {
        let rules = [];

        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case "whitespace":
                    break;
                case "EOF":
                    return rules;
                case "CDO":
                case "CDC": {
                    if (topLevelFlag) {
                        continue;
                    }
                    this.cursor = cursorBeforeTk;
                    let rule = this.consumeQualifiedRule();
                    if (rule !== null) {
                        rules.push(rule);
                    }
                    break;
                }
                case "at-keyword":
                    this.cursor = cursorBeforeTk;
                    rules.push(this.consumeAtRule(tk.value));
                default:
                    this.cursor = cursorBeforeTk;
                    let rule = this.consumeQualifiedRule();
                    if (rule !== null) {
                        rules.push(rule);
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-an-at-rule
    // NOTE: This assumes @name has been already been consumed.
    consumeAtRule(name: string): AtRule {
        this.consumeToken();
        let prelude = [];

        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case "semicolon":
                    return {
                        type: "ast-at-rule",
                        name,
                        prelude,
                        value: [],
                    };
                case "EOF":
                    // PARSE ERROR
                    return {
                        type: "ast-at-rule",
                        name,
                        prelude,
                        value: [],
                    };
                case "{": {
                    let block = this.consumeSimpleBlock(tk);
                    if (block.type !== "ast-simple-block") {
                        throw new Error("unreachable");
                    }
                    return {
                        type: "ast-at-rule",
                        name,
                        prelude,
                        value: block.value,
                    };
                }
                default:
                    if (
                        tk.type === "ast-simple-block" &&
                        tk.subType === "curly"
                    ) {
                        return {
                            type: "ast-at-rule",
                            name,
                            prelude,
                            value: tk.value,
                        };
                    } else {
                        this.cursor = cursorBeforeTk;
                        prelude.push(this.consumeComponentValue());
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-qualified-rule
    consumeQualifiedRule(): QualifiedRule | null {
        let prelude = [];

        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case "EOF":
                    // PARSE ERROR
                    return null;
                case "{": {
                    let block = this.consumeSimpleBlock(tk);
                    if (block.type !== "ast-simple-block") {
                        throw new Error("unreachable");
                    }
                    return {
                        type: "ast-qualified-rule",
                        prelude,
                        value: block.value,
                    };
                }
                default:
                    if (
                        tk.type === "ast-simple-block" &&
                        tk.subType === "curly"
                    ) {
                        return {
                            type: "ast-qualified-rule",
                            prelude,
                            value: tk.value,
                        };
                    } else {
                        this.cursor = cursorBeforeTk;
                        prelude.push(this.consumeComponentValue());
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-list-of-declarations
    consumeStyleBlockContents(): (Declaration | AtRule | QualifiedRule)[] {
        let decls = [];
        let rules = [];

        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case "whitespace":
                case "semicolon":
                    break;
                case "EOF":
                    for (const rule of rules) {
                        decls.push(rule);
                    }
                    return decls;
                case "at-keyword":
                    this.cursor = cursorBeforeTk;
                    decls.push(this.consumeAtRule(tk.value));
                case "ident": {
                    let tempList: ComponentValue[] = [
                        { type: "ident", value: tk.value },
                    ];
                    while (
                        this.nextToken().type !== "EOF" &&
                        this.nextToken().type !== "semicolon"
                    ) {
                        tempList.push(this.consumeComponentValue());
                    }
                    let ts = new TokenStream(tempList);
                    let decl = ts.consumeDeclaration();
                    if (decl !== null) {
                        decls.push(decl);
                    }
                }
                default:
                    if (tk.type === "delim" && tk.value === "&") {
                        this.cursor = cursorBeforeTk;
                        let rule = this.consumeQualifiedRule();
                        if (rule !== null) {
                            rules.push(rule);
                        }
                    } else {
                        // PARSE ERROR
                        this.cursor = cursorBeforeTk;
                        while (
                            this.nextToken().type !== "EOF" &&
                            this.nextToken().type !== "semicolon"
                        ) {
                            this.consumeComponentValue();
                        }
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-list-of-declarations
    consumeListOfDeclarations(): (Declaration | AtRule)[] {
        let decls = [];
        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case "whitespace":
                case "semicolon":
                    break;
                case "EOF":
                    return decls;
                case "at-keyword":
                    this.cursor = cursorBeforeTk;
                    decls.push(this.consumeAtRule(tk.value));
                case "ident": {
                    let tempList: ComponentValue[] = [
                        { type: "ident", value: tk.value },
                    ];
                    while (this.nextToken().type !== "EOF") {
                        tempList.push(this.consumeComponentValue());
                    }
                    let ts = new TokenStream(tempList);
                    let decl = ts.consumeDeclaration();
                    if (decl !== null) {
                        decls.push(decl);
                    }
                }
                default:
                    // PARSE ERROR
                    this.cursor = cursorBeforeTk;
                    while (this.nextToken().type !== "EOF") {
                        this.consumeComponentValue();
                    }
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-declaration
    // NOTE: This assumes next token is ident token!
    consumeDeclaration(): Declaration | null {
        let declNameTk = this.consumeToken();
        if (declNameTk.type !== "ident") {
            throw TypeError("expected ident token at this point");
        }
        let declName = declNameTk.value;
        let declValue = [];
        let declImportant = false;
        // S1
        this.skipWhitespaces();
        // S2
        if (this.nextToken().type !== "colon") {
            return null;
        }
        this.consumeToken();
        // S3
        this.skipWhitespaces();
        // S4
        while (this.nextToken().type !== "EOF") {
            declValue.push(this.consumeComponentValue());
        }
        // S5
        // Check if last two non-whitespace tokens are <!important>.
        let lastTwo = declValue.filter((v) => {
            return v.type !== "whitespace";
        });
        lastTwo = [lastTwo[lastTwo.length - 2], lastTwo[lastTwo.length - 1]];
        if (
            lastTwo[0].type === "delim" &&
            lastTwo[0].value === "!" &&
            lastTwo[1].type === "ident" &&
            lastTwo[1].value === "important"
        ) {
            declImportant = true;
            // Remove last two non-whitespace tokens.
            for (let i = 0; i < 2; i++) {
                let nonWhitespaces = declValue
                    .map<[ComponentValue, number]>((v) => [v, 1])
                    .filter(([v]) => v.type !== "whitespace");
                let lastIdx = nonWhitespaces[nonWhitespaces.length - 1][1];
                declValue.splice(lastIdx, 1);
            }
        }
        // S6
        while (declValue[declValue.length - 1].type !== "whitespace") {
            declValue.pop();
        }

        // S7
        return {
            type: "ast-declaration",
            name: declName,
            value: declValue,
            important: declImportant,
        };
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-component-value
    consumeComponentValue(): ComponentValue {
        const tk = this.consumeToken();
        switch (tk.type) {
            case "(":
                return this.consumeSimpleBlock(tk);
            case "[":
                return this.consumeSimpleBlock(tk);
            case "{":
                return this.consumeSimpleBlock(tk);
            case "function":
                return this.consumeFunction(tk.value);
            default:
                return tk;
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-simple-block
    consumeSimpleBlock(openingChar: Token): SimpleBlock {
        let closingTokenType;
        let subType: "paren" | "square" | "curly";
        switch (openingChar.type) {
            case "(":
                closingTokenType = ")";
                subType = "paren";
                break;
            case "[":
                closingTokenType = "]";
                subType = "square";
                break;
            case "{":
                closingTokenType = "}";
                subType = "curly";
                break;
            default:
                throw TypeError("called with bad token");
        }
        let body = [];
        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            if (tk.type === closingTokenType) {
                return { type: "ast-simple-block", subType, value: body };
            } else if (tk.type === "EOF") {
                // PARSE ERROR
                return { type: "ast-simple-block", subType, value: body };
            } else {
                this.cursor = cursorBeforeTk;
                body.push(this.consumeComponentValue());
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-a-function
    consumeFunction(name: string): Function {
        let value = [];
        while (true) {
            let cursorBeforeTk = this.cursor;
            const tk = this.consumeToken();
            switch (tk.type) {
                case ")":
                    return { type: "ast-function", name, value };
                case "EOF":
                    // PARSE ERROR
                    return { type: "ast-function", name, value };
                default:
                    this.cursor = cursorBeforeTk;
                    value.push(this.consumeComponentValue());
            }
        }
    }

    // https://www.w3.org/TR/css-syntax-3/#typedef-declaration-value
    __consumeDeclarationValueImpl(
        anyValue: boolean,
    ): (Token | ComponentValue)[] {
        let res = [];
        let openBlockTokens = [];

        mainLoop: while (true) {
            let isTopLevel = openBlockTokens.length === 0;
            let cursorBeforeTk = this.cursor;
            let tk = this.consumeToken();
            switch (tk.type) {
                case "bad-string":
                case "bad-url":
                    this.cursor = cursorBeforeTk;
                    break mainLoop;
                case "(":
                case "[":
                case "{":
                    // If we have block opening token, push it to the stack.
                    openBlockTokens.push(tk);
                    break;
                case ")":
                case "]":
                case "}": {
                    // If we have block closing token, see if we have unmatched token.
                    let expectedLeftTokenType;
                    switch (tk.type) {
                        case ")":
                            expectedLeftTokenType = "(";
                        case "]":
                            expectedLeftTokenType = "[";
                        case "}":
                            expectedLeftTokenType = "{";
                    }
                    if (openBlockTokens.length === 0) {
                        this.cursor = cursorBeforeTk;
                        break mainLoop;
                    }
                    const lastOpenToken =
                        openBlockTokens[openBlockTokens.length - 1];
                    if (lastOpenToken.type != expectedLeftTokenType) {
                        this.cursor = cursorBeforeTk;
                        break mainLoop;
                    }
                    break;
                }
                default:
                    if (tk.type === "semicolon" && !anyValue && isTopLevel) {
                        this.cursor = cursorBeforeTk;
                        break mainLoop;
                    } else if (tk.type === "delim" && !anyValue) {
                        this.cursor = cursorBeforeTk;
                        break mainLoop;
                    }
                    break;
            }
            res.push(tk);
        }
        return res;
    }

    consumeDeclarationValue(): (Token | ComponentValue)[] {
        return this.__consumeDeclarationValueImpl(false);
    }
    consumeAnyValue(): (Token | ComponentValue)[] {
        return this.__consumeDeclarationValueImpl(true);
    }
}
