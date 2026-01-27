import {
    isAsciiAlphabet,
    isAsciiDigit,
    isAsciiLowercaseHexDigit,
    isAsciiUppercaseAlphabet,
    normalizeCodepoint,
} from "../utility";

export function computedStyleProperty(
    elem: Element,
    name: string,
): CSSStyleValue {
    const v = elem.computedStyleMap().get(name);
    if (v === undefined) {
        return new Error("computedStyleMap().get() returned undefined");
    }
    return v;
}

// https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape
function startsWithValidEscape(input: string): boolean {
    const cps = [input.charAt(0), input.charAt(1)];
    if (cps[0] !== "\\") {
        return false;
    }
    if (cps[1] === "\n") {
        return false;
    }
    return true;
}

//https://www.w3.org/TR/css-syntax-3/#ident-start-code-point
function isIdentStartCodePoint(c: string | number): boolean {
    const cp = normalizeCodepoint(c);
    return isAsciiAlphabet(cp) || 0x80 <= cp || c == "_";
}

//https://www.w3.org/TR/css-syntax-3/#ident-code-point
function isIdentCodePoint(c: string | number): boolean {
    return isIdentStartCodePoint(c) || isAsciiDigit(c) || c == "-";
}

// https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
// NOTE: This assumes \ has been already consumed
function consumeEscapedCodePoint(input: string): [string, string] {
    let hasHexDigit = false;
    let hexDigitVal = 0;
    let hexDigitCount = 0;

    if (input.length === 0) {
        // PARSE ERROR: Unexpected EOF
        return ["\u{fffd}", input];
    }

    while (true) {
        if (6 <= hexDigitCount) {
            break;
        }
        const nextCharCp = input.codePointAt(0);
        if (nextCharCp === undefined) {
            break;
        }
        let digit;
        if (isAsciiDigit(nextCharCp)) {
            // ASCII digit
            digit = nextCharCp - 0x30;
        } else if (isAsciiLowercaseHexDigit(nextCharCp)) {
            // ASCII alpha a ~ f
            digit = nextCharCp - 0x61 + 10;
        } else if (isAsciiUppercaseAlphabet(nextCharCp)) {
            // ASCII alpha A ~ F
            digit = nextCharCp - 0x41 + 10;
        } else {
            break;
        }
        input = input.substring(1);
        hexDigitVal = hexDigitVal * 16 + digit;
        hasHexDigit = true;
        hexDigitCount++;
    }
    if (hasHexDigit) {
        return [String.fromCodePoint(hexDigitVal), input];
    } else {
        const c = input.charAt(1);
        input = input.substring(c.length);
        return [c, input];
    }
}

// https://www.w3.org/TR/css-syntax-3/#consume-string-token
// Returns parsed string and remaining input.
export function parseCSSString(input: string): [string, string] | null {
    let endingChar;
    if (input.startsWith('\"')) {
        endingChar = '\"';
    } else if (input.startsWith("'")) {
        endingChar = "'";
    } else {
        return null;
    }

    let res = "";
    while (true) {
        const nextChar = input.charAt(0);
        if (input.length !== 0) {
            input = input.substring(nextChar.length);
        }

        if (nextChar === endingChar) {
            // Closing char
            break;
        } else if (nextChar === "\n") {
            // PARSE ERROR: Unexpected newline
            return null;
        } else if (nextChar === "") {
            // PARSE ERROR: Unexpected EOF
            break;
        } else if (nextChar == "\\") {
            if (input.length === 0) {
                continue;
            } else if (input.startsWith("\n")) {
                input = input.substring(1);
                continue;
            } else {
                const [cp, remaining] = consumeEscapedCodePoint(input);
                res += cp;
                input = remaining;
            }
        } else {
            res += nextChar;
        }
    }
    return [res, input];
}

// https://www.w3.org/TR/css-syntax-3/#consume-name
export function parseCSSIdent(input: string): [string, string] | null {
    let res = "";

    while (true) {
        if (startsWithValidEscape(input)) {
            const [cp, remaining] = consumeEscapedCodePoint(input);
            res += cp;
            input = remaining;
        } else if (isIdentCodePoint(input.charAt(0))) {
            input = input.substring(input.charAt(0).length);
        } else {
            break;
        }
    }

    return [res, input];
}

// https://www.w3.org/TR/css-values-4/#mult-comma
export function parseCommaSeparatedRepeation<T>(
    input: string,
    minRepeats: number,
    maxRepeats: number | null,
    parse: (input: string) => [T, string] | null,
): [T[], string] | null {
    const res: T[] = [];

    while (true) {
        input = removePrefix(input, " ");
        const parseRes = parse(input);
        if (parseRes === null) {
            if (res.length !== 0) {
                return null;
            }
            break;
        }
        const [item, remaining] = parseRes;
        res.push(item);
        input = remaining;

        if (maxRepeats !== null && maxRepeats <= res.length) {
            break;
        }
        input = removePrefix(input, " ");
        if (!input.startsWith(",")) {
            break;
        }
        input = input.substring(1);
    }
    if (res.length < minRepeats) {
        return null;
    }
    return [res, input];
}
