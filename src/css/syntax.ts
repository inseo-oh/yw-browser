// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import IOQueue, {
    getEncodingFromLabel,
    UTF16_BE_ENCODING,
    UTF16_LE_ENCODING,
    UTF8_ENCODING,
    decode as encodingDecode,
    type Encoding,
} from "../encoding.js";
import {
    isSurrogate,
    isASCIICaseInsensitiveMatch,
    toASCIILowercase,
} from "../infra.js";
import { TextReader, toCodePoint } from "../utility.js";
import { CSSStyleSheet, StyleDeclaration, StyleRule } from "./om.js";
import {
    Inherit,
    Initial,
    PROPERTY_DESCRIPTORS,
    Unset,
    type UnfinalizedPropertyValue,
} from "./properties.js";
import { parseSelector } from "./selector.js";

//==============================================================================
// CSS Syntax Module Level 3 - 3.2.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#css-decode-bytes
function decode(bytes: Uint8Array): string {
    const fallback = determineFallbackEncoding(bytes);
    const input = new IOQueue();
    for (const aByte of bytes) {
        input.pushOne(aByte);
    }
    const output = encodingDecode(input, fallback);
    return output.toString();
}

// https://www.w3.org/TR/css-syntax-3/#determine-the-fallback-encoding
function determineFallbackEncoding(bytes: Uint8Array): Encoding {
    // S1.
    // TODO

    // S2.
    const bytesLen = Math.min(1024, bytes.byteLength);

    charsetAtRule: if (
        // @charset "
        bytes[0] === 0x40 &&
        bytes[1] === 0x63 &&
        bytes[2] === 0x68 &&
        bytes[3] === 0x61 &&
        bytes[4] === 0x72 &&
        bytes[5] === 0x73 &&
        bytes[6] === 0x65 &&
        bytes[7] === 0x74 &&
        bytes[8] === 0x20 &&
        bytes[9] === 0x22
    ) {
        let label = "";
        for (let i = 10; i < bytesLen; i++) {
            const byt0 = bytes[i];
            const byt1 = bytes[i + 1];
            if (byt0 !== undefined && byt0 === 0x22 && byt1 === 0x3b /* "; */) {
                break;
            }
            if (byt0 === undefined) {
                break charsetAtRule;
            }
            label = String.fromCodePoint(byt0);
        }
        const enc = getEncodingFromLabel(label);
        if (enc == UTF16_BE_ENCODING || enc == UTF16_LE_ENCODING) {
            // This is not a bug. The standard says to do this.
            return UTF8_ENCODING;
        } else if (enc != null) {
            return enc;
        }
    }

    // S3.
    // TODO

    // S4
    return UTF8_ENCODING;
}

// https://www.w3.org/TR/css-syntax-3/#css-filter-code-points
function filterCodepoints(input: string): string {
    let res = "";
    let remaining = input;
    while (remaining.length !== 0) {
        if (remaining.startsWith("\r\n")) {
            // CR followed by LF
            remaining = remaining.substring(2);
        } else if (remaining.startsWith("\r") || remaining.startsWith("\n")) {
            res += "\n";
            remaining = remaining.substring(1);
        } else if (
            remaining.startsWith(String.fromCodePoint(0)) ||
            isSurrogate(remaining.codePointAt(0)!)
        ) {
            res += "\ufffd";
            remaining = remaining.substring(1);
        } else {
            res += remaining.charAt(0);
            remaining = remaining.substring(1);
        }
    }
    return res;
}

//==============================================================================
// CSS Syntax Module Level 3 - 4.
//==============================================================================

export type HashType = "id" | "unrestricted";
export type NumberType = "integer" | "number";

export type Token =
    | { kind: "ident"; value: string }
    | { kind: "function"; value: string }
    | { kind: "at-keyword"; value: string }
    | { kind: "hash"; value: string; type: HashType }
    | { kind: "string"; value: string }
    | { kind: "bad-string" }
    | { kind: "url"; value: string }
    | { kind: "bad-url" }
    | { kind: "delim"; value: string }
    | { kind: "number"; value: number; type: NumberType }
    | { kind: "percentage"; value: number }
    | { kind: "dimension"; value: number; type: NumberType; unit: string }
    | { kind: "whitespace" }
    | { kind: "CDO" }
    | { kind: "CDC" }
    | { kind: "colon" }
    | { kind: "semicolon" }
    | { kind: "comma" }
    | { kind: "[" }
    | { kind: "]" }
    | { kind: "(" }
    | { kind: ")" }
    | { kind: "{" }
    | { kind: "}" };

// https://www.w3.org/TR/css-syntax-3/#css-tokenize
function tokenize(input: string): Token[] {
    const result = [];
    const tkr = new Tokenizer(input);
    console.time("tokenize");
    while (true) {
        const tk = tkr.consumeToken();
        if (tk === undefined) {
            break;
        }
        result.push(tk);
    }
    console.timeEnd("tokenize");
    return result;
}

export function serializeTokens(tokens: (Token | ASTObject)[]): string {
    return tokens.map((x) => serializeToken(x)).join("");
}
export function serializeToken(token: Token | ASTObject): string {
    switch (token.kind) {
        case "ident":
            return token.value;
        case "function":
            return `${token.value}(`;
        case "at-keyword":
            return `@${token.value}`;
        case "hash":
            return `#${token.value}`;
        case "string":
            return `"${token.value.replace('"', '\\"')}"`;
        case "bad-string":
            return "/* bad-string */";
        case "url":
            return `url(${token.value})`;
        case "bad-url":
            return "/* bad-url */";
        case "delim":
            return token.value;
        case "number":
            return `${token.value}`;
        case "percentage":
            return `${token.value}%`;
        case "dimension":
            return `${token.value}${token.unit}`;
        case "whitespace":
            return " ";
        case "CDO":
            return "<!--";
        case "CDC":
            return "-->";
        case "colon":
            return ":";
        case "semicolon":
            return ";";
        case "comma":
            return ",";
        case "[":
            return "[";
        case "]":
            return "]";
        case "(":
            return "(";
        case ")":
            return ")";
        case "{":
            return "{";
        case "}":
            return "}";
        case "ast-at-rule":
            if (token.body !== undefined) {
                return `@${token.name} ${serializeTokens(token.prelude)}{${serializeTokens(token.body)}}`;
            } else {
                return `@${token.name} ${serializeTokens(token.prelude)};`;
            }
        case "ast-qualified-rule":
            return `${serializeTokens(token.prelude)}{${serializeTokens(token.body)}}`;
        case "ast-declaration":
            return `${token.name}:{${serializeTokens(token.value)}}${token.important ? "!important" : ""}`;
        case "ast-function":
            return `${token.name}(${serializeTokens(token.value)})`;
        case "ast-simple-block":
            switch (token.associatedTokenKind) {
                case "{":
                    return `{${serializeTokens(token.value)}}`;
                case "[":
                    return `[${serializeTokens(token.value)}]`;
                case "(":
                    return `(${serializeTokens(token.value)})`;
            }
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 4.2.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#digit
function isDigit(codePoint: number | undefined): boolean {
    return (
        codePoint !== undefined && 0x0030 <= codePoint && codePoint <= 0x0039
    );
}

// https://www.w3.org/TR/css-syntax-3/#hex-digit
function isHexDigit(codePoint: number | undefined): boolean {
    return (
        codePoint !== undefined &&
        (isDigit(codePoint) ||
            (0x0061 <= codePoint && codePoint <= 0x0066) ||
            (0x0041 <= codePoint && codePoint <= 0x0046))
    );
}

// https://www.w3.org/TR/css-syntax-3/#uppercase-letter
function isUppercaseLetter(codePoint: number | undefined): boolean {
    return (
        codePoint !== undefined && 0x0041 <= codePoint && codePoint <= 0x005a
    );
}

// https://www.w3.org/TR/css-syntax-3/#lowercase-letter
function isLowercaseLetter(codePoint: number | undefined): boolean {
    return (
        codePoint !== undefined && 0x0061 <= codePoint && codePoint <= 0x007a
    );
}

// https://www.w3.org/TR/css-syntax-3/#letter
function isLetter(codePoint: number | undefined): boolean {
    return isUppercaseLetter(codePoint) || isLowercaseLetter(codePoint);
}

// https://www.w3.org/TR/css-syntax-3/#non-ascii-code-point
function isNonASCIICodePoint(codePoint: number | undefined): boolean {
    return codePoint !== undefined && 0x80 <= codePoint;
}

// https://www.w3.org/TR/css-syntax-3/#ident-start-code-point
function isIdentStartCodePoint(codePoint: number | undefined): boolean {
    return (
        isLetter(codePoint) ||
        isNonASCIICodePoint(codePoint) ||
        codePoint === 0x005f
    );
}

// https://www.w3.org/TR/css-syntax-3/#ident-code-point
function isIdentCodePoint(codePoint: number | undefined): boolean {
    return (
        isIdentStartCodePoint(codePoint) ||
        isDigit(codePoint) ||
        codePoint === 0x002d
    );
}

// https://www.w3.org/TR/css-syntax-3/#non-printable-code-point
function isNonPrintableCodePoint(codePoint: number | undefined): boolean {
    return (
        codePoint !== undefined &&
        ((0x0000 <= codePoint && codePoint <= 0x0008) ||
            codePoint === 0x000b ||
            (0x000e <= codePoint && codePoint <= 0x001f) ||
            codePoint === 0x007f)
    );
}

// https://www.w3.org/TR/css-syntax-3/#newline
function isNewline(codePoint: number | undefined): boolean {
    return codePoint === 0x000a;
}

// https://www.w3.org/TR/css-syntax-3/#whitespace
function isWhitespace(codePoint: number | undefined): boolean {
    return isNewline(codePoint) || codePoint === 0x0020 || codePoint === 0x0009;
}

class Tokenizer {
    tr: TextReader;

    constructor(str: string) {
        this.tr = new TextReader(str);
    }

    consumeWhitespaces(): void {
        while (!this.tr.isEnd()) {
            if (!isWhitespace(toCodePoint(this.tr.getNextChar()))) {
                break;
            }
            this.tr.consumeChar();
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.1.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-token
    consumeToken(): Token | undefined {
        const oldCursor = this.tr.cursor;
        this.consumeComments();
        while (true) {
            const chr = this.tr.consumeChar();
            if (chr !== undefined && isWhitespace(toCodePoint(chr))) {
                this.consumeWhitespaces();
                return { kind: "whitespace" };
            } else if (chr === '"') {
                return this.consumeStringToken(chr);
            } else if (chr === "#") {
                if (
                    isIdentCodePoint(toCodePoint(this.tr.getNextChar())) ||
                    this.startsWithValidEscape()
                ) {
                    // S1.
                    let type: HashType = "unrestricted";

                    // S2.
                    if (this.startsWithIdentSequence()) {
                        type = "id";
                    }

                    // S3.
                    const value = this.consumeIdentSequence();

                    // S4.
                    return { kind: "hash", value, type };
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === "'") {
                return this.consumeStringToken(chr);
            } else if (chr === "(") {
                return { kind: "(" };
            } else if (chr === ")") {
                return { kind: ")" };
            } else if (chr === "+") {
                if (this.startsWithNumber()) {
                    this.tr.cursor = oldCursor;
                    return this.consumeNumericToken();
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === ",") {
                return { kind: "comma" };
            } else if (chr === "-") {
                if (this.startsWithNumber()) {
                    this.tr.cursor = oldCursor;
                    return this.consumeNumericToken();
                } else if (this.tr.startsWith("->")) {
                    return { kind: "CDC" };
                } else if (this.startsWithIdentSequence()) {
                    this.tr.cursor = oldCursor;
                    return this.consumeIdentLikeToken();
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === ".") {
                if (this.startsWithNumber()) {
                    this.tr.cursor = oldCursor;
                    return this.consumeNumericToken();
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === ":") {
                return { kind: "colon" };
            } else if (chr === ";") {
                return { kind: "semicolon" };
            } else if (chr === "<") {
                if (this.tr.startsWith("!--")) {
                    return { kind: "CDO" };
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === "@") {
                if (this.startsWithIdentSequence()) {
                    const value = this.consumeIdentSequence();
                    return { kind: "at-keyword", value };
                } else {
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === "[") {
                return { kind: "[" };
            } else if (chr === "\\") {
                if (this.startsWithValidEscape()) {
                    this.tr.cursor = oldCursor;
                    return this.consumeIdentLikeToken();
                } else {
                    // PARSE ERROR
                    return {
                        kind: "delim",
                        value: this.tr.getCurrentChar(),
                    };
                }
            } else if (chr === "]") {
                return { kind: "]" };
            } else if (chr === "{") {
                return { kind: "{" };
            } else if (chr === "}") {
                return { kind: "}" };
            } else if (isDigit(toCodePoint(chr))) {
                this.tr.cursor = oldCursor;
                return this.consumeNumericToken();
            } else if (isIdentStartCodePoint(toCodePoint(chr))) {
                this.tr.cursor = oldCursor;
                return this.consumeIdentLikeToken();
            } else if (chr === "") {
                return undefined;
            } else {
                return {
                    kind: "delim",
                    value: this.tr.getCurrentChar(),
                };
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.2.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-comments
    consumeComments(): void {
        let endFound = false;
        while (!this.tr.isEnd()) {
            if (!this.tr.consumeString("/*", TextReader.NO_MATCH_FLAGS)) {
                return;
            }
            while (!this.tr.isEnd()) {
                if (this.tr.consumeString("*/", TextReader.NO_MATCH_FLAGS)) {
                    endFound = true;
                    break;
                }
                this.tr.consumeChar();
            }
            if (endFound) {
                continue;
            }
            // PARSE ERROR: Reached EOF without closing the comment.
            return;
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.3.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-numeric-token
    consumeNumericToken(): Token {
        const [value, type] = this.consumeNumber();
        if (this.startsWithIdentSequence()) {
            // S1., S2.
            const unit = this.consumeIdentSequence();

            // S3.
            return {
                kind: "dimension",
                value: value,
                type: type,
                unit,
            };
        } else if (this.tr.getNextChar() === "%") {
            this.tr.consumeChar();
            return { kind: "percentage", value };
        } else {
            return { kind: "number", value, type };
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.4.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-an-ident-like-token
    consumeIdentLikeToken(): Token {
        const string = this.consumeIdentSequence();

        if (
            isASCIICaseInsensitiveMatch(string, "url") &&
            this.tr.getNextChar() === "("
        ) {
            do {
                this.tr.consumeChar();
            } while (
                isWhitespace(toCodePoint(this.tr.getNextChar())) &&
                isWhitespace(toCodePoint(this.tr.getNextChar(1)))
            );
            if (
                this.tr.getNextChar() === '"' ||
                this.tr.getNextChar() === "'" ||
                (isWhitespace(toCodePoint(this.tr.getNextChar())) &&
                    (this.tr.getNextChar(1) === '"' ||
                        this.tr.getNextChar(1) === "'"))
            ) {
                return { kind: "function", value: string };
            } else {
                return this.consumeURLToken();
            }
        } else if (this.tr.getNextChar() === "(") {
            this.tr.consumeChar();
            return { kind: "function", value: string };
        }
        return { kind: "ident", value: string };
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.5.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-string-token
    consumeStringToken(endingChar: string): Token {
        let value = "";
        while (!this.tr.isEnd()) {
            const oldCursor = this.tr.cursor;
            const chr = this.tr.consumeChar();
            if (chr === endingChar) {
                break;
            } else if (chr === "") {
                // PARSE ERROR: Unexpected EOF
                break;
            } else if (isNewline(toCodePoint(chr))) {
                // PARSE ERROR: Unexpected newline
                this.tr.cursor = oldCursor;
                return { kind: "bad-string" };
            } else if (toCodePoint(chr) === 0x005c) {
                if (this.tr.getNextChar() !== undefined) {
                    if (isNewline(toCodePoint(this.tr.getNextChar()))) {
                        this.tr.consumeChar();
                    } else {
                        value += String.fromCodePoint(
                            this.consumeEscapedCodePoint()!,
                        );
                    }
                }
            } else {
                value += chr;
            }
        }
        return { kind: "string", value };
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.6.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-url-token
    consumeURLToken(): Token {
        // S1.
        let value = "";

        // S2.
        this.consumeWhitespaces();

        // S3.
        while (true) {
            const chr = this.tr.consumeChar();
            if (chr === ")") {
                return { kind: "url", value };
            } else if (chr === "") {
                // PARSE ERROR: Unexpected EOF
                return { kind: "url", value };
            } else if (isWhitespace(toCodePoint(chr))) {
                this.consumeWhitespaces();
                if (
                    this.tr.getNextChar() === ")" ||
                    this.tr.getNextChar() === ""
                ) {
                    // NOTE: If it was EOF(undefined), this is a PARSE ERROR
                    this.tr.consumeChar();
                    return { kind: "url", value };
                } else {
                    this.consumeRemnantsOfBadUrl();
                    return { kind: "bad-url" };
                }
            }
            if (
                chr === '"' ||
                chr === "'" ||
                chr === "(" ||
                isNonPrintableCodePoint(toCodePoint(chr))
            ) {
                this.consumeRemnantsOfBadUrl();
                return { kind: "bad-url" };
            } else if (chr === "\\") {
                if (this.startsWithValidEscape()) {
                    value += String.fromCodePoint(
                        this.consumeEscapedCodePoint()!,
                    );
                } else {
                    this.consumeRemnantsOfBadUrl();
                    return { kind: "bad-url" };
                }
            } else {
                value += chr;
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.7.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point
    consumeEscapedCodePoint(): number {
        this.tr.consumeChar();
        let foundHexDigit = false;
        let hexDigitVal = 0;
        let hexDigitCount = 0;

        if (this.tr.isEnd()) {
            // PARSE ERROR: Unexpected EOF
            return 0xfffd;
        }
        while (!this.tr.isEnd() && hexDigitCount < 6) {
            const tempCodePoint = toCodePoint(this.tr.getNextChar());
            let digit;
            if (
                tempCodePoint !== undefined &&
                isHexDigit(tempCodePoint) &&
                isDigit(tempCodePoint)
            ) {
                digit = tempCodePoint - 0x0030;
            } else if (
                tempCodePoint !== undefined &&
                isHexDigit(tempCodePoint) &&
                isLowercaseLetter(tempCodePoint)
            ) {
                digit = tempCodePoint - 0x0061 + 10;
            } else if (
                tempCodePoint !== undefined &&
                isHexDigit(tempCodePoint) &&
                isUppercaseLetter(tempCodePoint)
            ) {
                digit = tempCodePoint - 0x0041 + 10;
            } else {
                break;
            }
            this.tr.consumeChar();
            hexDigitVal = hexDigitVal * 16 + digit;
            foundHexDigit = true;
            hexDigitCount++;
        }
        if (foundHexDigit) {
            return hexDigitVal;
        } else {
            return this.tr.consumeChar()!.codePointAt(0)!;
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.8.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape
    startsWithValidEscape(): boolean {
        const oldCursor = this.tr.cursor;
        const s = this.tr.consumeChars(2);
        this.tr.cursor = oldCursor;
        return twoCodePointsAreValidEscape(s);
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.9.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence
    startsWithIdentSequence(): boolean {
        const oldCursor = this.tr.cursor;
        const s = this.tr.consumeChars(3);
        this.tr.cursor = oldCursor;
        return threeCodePointsWouldStartIdentSequence(s);
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.10.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-a-number
    startsWithNumber(): boolean {
        const oldCursor = this.tr.cursor;
        const s = this.tr.consumeChars(3);
        this.tr.cursor = oldCursor;
        return threeCodePointsWouldStartNumber(s);
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.11.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-an-ident-sequence
    consumeIdentSequence(): string {
        let result = "";
        while (true) {
            const oldCursor = this.tr.cursor;
            const chr = this.tr.consumeChar();
            if (chr !== undefined && isIdentCodePoint(toCodePoint(chr))) {
                result += chr;
            } else if (this.startsWithValidEscape()) {
                result += String.fromCodePoint(this.consumeEscapedCodePoint()!);
            } else {
                this.tr.cursor = oldCursor;
                return result;
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.12.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-number
    consumeNumber(): [number, NumberType] {
        // S1.
        let type: NumberType = "integer";
        let repr = "";

        // S2.
        if (this.tr.getNextChar() === "+" || this.tr.getNextChar() === "-") {
            repr += this.tr.consumeChar();
        }

        // S3.
        while (isDigit(toCodePoint(this.tr.getNextChar()))) {
            repr += this.tr.consumeChar();
        }

        // S4.
        if (
            this.tr.getNextChar() === "." &&
            isDigit(toCodePoint(this.tr.getNextChar(1)))
        ) {
            // S4-1.
            const chars = this.tr.consumeChars(2);

            // S4-2.
            repr += chars;

            // S4-3.
            type = "number";

            // S4-4.
            while (isDigit(toCodePoint(this.tr.getNextChar()))) {
                repr += this.tr.consumeChar();
            }
        }

        // S5.
        if (
            (this.tr.getNextChar() === "e" || this.tr.getNextChar() === "E") &&
            (((this.tr.getNextChar(1) === "+" ||
                this.tr.getNextChar() === "-") &&
                isDigit(toCodePoint(this.tr.getNextChar(2)))) ||
                isDigit(toCodePoint(this.tr.getNextChar(1))))
        ) {
            const areTwoChars = isDigit(toCodePoint(this.tr.getNextChar(1)));
            let chars;

            // S5-1.
            if (areTwoChars) {
                chars = this.tr.consumeChars(2);
            } else {
                chars = this.tr.consumeChars(3);
            }

            // S5-2.
            repr += chars;

            // S5-3.
            type = "number";

            // S5-4.
            while (isDigit(toCodePoint(this.tr.getNextChar()))) {
                repr += this.tr.consumeChar();
            }
        }

        // S6.
        const value = parseFloat(repr);

        // S7.
        return [value, type];
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 4.3.14.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-the-remnants-of-a-bad-url
    consumeRemnantsOfBadUrl(): void {
        while (true) {
            const chr = this.tr.consumeChar();
            if (chr === ")" || chr === "") {
                return;
            } else if (this.startsWithValidEscape()) {
                this.consumeEscapedCodePoint();
            }
        }
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 4.3.8.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape
function twoCodePointsAreValidEscape(s: string): boolean {
    if (s.length === 0 || s.charAt(0) !== "\\") {
        return false;
    }
    return 2 > s.length || !isNewline(s.codePointAt(1));
}

//==============================================================================
// CSS Syntax Module Level 3 - 4.3.9.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence
function threeCodePointsWouldStartIdentSequence(s: string): boolean {
    if (s.length !== 0 && s.charAt(0) === "-") {
        return (
            (2 <= s.length && isIdentCodePoint(s.codePointAt(1))) ||
            s.charAt(1) === "-" ||
            (3 <= s.length && twoCodePointsAreValidEscape(s.substring(1)))
        );
    } else if (s.length !== 0 && isIdentStartCodePoint(s.codePointAt(0))) {
        return true;
    } else if (s.length !== 0 && s === "\\") {
        return twoCodePointsAreValidEscape(s);
    }
    return false;
}

//==============================================================================
// CSS Syntax Module Level 3 - 4.3.10.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-a-number
function threeCodePointsWouldStartNumber(s: string): boolean {
    if (s.length !== 0 && (s.charAt(0) === "+" || s.charAt(0) === "-")) {
        return (
            (2 <= s.length && isDigit(s.codePointAt(1))) ||
            (3 <= s.length && s.charAt(1) === "." && isDigit(s.codePointAt(2)))
        );
    } else if (s.length !== 0 && s.charAt(0) === ".") {
        return 2 <= s.length && isDigit(s.codePointAt(1));
    } else {
        return s.length !== 0 && isDigit(s.codePointAt(0));
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#at-rule
export type ASTAtRule = {
    kind: "ast-at-rule";
    name: string;
    prelude: (Token | ASTObject)[];
    body: (Token | ASTObject)[] | undefined;
};

// https://www.w3.org/TR/css-syntax-3/#qualified-rule
export type ASTQualifiedRule = {
    kind: "ast-qualified-rule";
    prelude: (Token | ASTObject)[];
    body: (Token | ASTObject)[];
};

// https://www.w3.org/TR/css-syntax-3/#declaration
export type ASTDeclaration = {
    kind: "ast-declaration";
    name: string;
    value: (Token | ASTObject)[];
    important: boolean;
};

// https://www.w3.org/TR/css-syntax-3/#function
export type ASTFunction = {
    kind: "ast-function";
    name: string;
    value: (Token | ASTObject)[];
};

// https://www.w3.org/TR/css-syntax-3/#simple-block
export type ASTSimpleBlock = {
    kind: "ast-simple-block";
    associatedTokenKind: "{" | "[" | "(";
    value: (Token | ASTObject)[];
};

export type ASTObject =
    | ASTAtRule
    | ASTQualifiedRule
    | ASTDeclaration
    | ASTFunction
    | ASTSimpleBlock;

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.
//==============================================================================

type TokenStreamInput = Token[] | (Token | ASTObject)[] | TokenStream | string;

// https://www.w3.org/TR/css-syntax-3/#normalize-into-a-token-stream
function normalizeIntoTokenStream(input: TokenStreamInput): TokenStream {
    // S1., S2.
    if (input instanceof Array) {
        return new TokenStream(input);
    } else if (input instanceof TokenStream) {
        return input;
    }

    // S3.
    if (typeof input === "string") {
        input = filterCodepoints(input);
        return new TokenStream(tokenize(input));
    }

    // S4.
    throw TypeError("invalid argument was given");
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.1.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#css-parse-something-according-to-a-css-grammar
export function parse<T>(
    input: TokenStreamInput,
    parser: (ts: TokenStream) => T,
): T {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    const result = parseListOfComponentValues(nInput);

    // S3.
    return parser(new TokenStream(result));
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.2.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#css-parse-a-comma-separated-list-according-to-a-css-grammar
export function parseList<T>(
    input: TokenStreamInput,
    parser: (ts: TokenStream) => T,
): (T | undefined)[] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    if (nInput.tokens.every((x) => x.kind === "whitespace")) {
        return [];
    }

    // S3.
    const cList = parseCommaSeparatedListOfComponentValues(nInput);

    // S4.
    const list = cList.map((c) => {
        try {
            return parse(c, parser);
        } catch {
            return undefined;
        }
    });

    // S5.
    return list;
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.3.
//==============================================================================

// NOTE: This represents an unparsed stylesheet. It's just a wrapper around token list for the most part.
type RawStylesheet = {
    value: (ASTQualifiedRule | ASTAtRule)[];
    location: string | null;
};

// https://www.w3.org/TR/css-syntax-3/#parse-stylesheet
export function parseStylesheet(
    input: Uint8Array | TokenStreamInput,
    location?: string,
): RawStylesheet {
    // S1.
    const tInput = input instanceof Uint8Array ? decode(input) : input;

    // S2.
    const nInput = normalizeIntoTokenStream(tInput);

    // S3.
    const stylesheet: RawStylesheet = { value: [], location: location ?? null };

    // S4.
    stylesheet.value = nInput.consumeListOfRules(true);

    // S5.
    return stylesheet;
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.4.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-rules
export function parseListOfRules(
    input: TokenStreamInput,
): (ASTAtRule | ASTQualifiedRule)[] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    const rules = nInput.consumeListOfRules(false);

    // S3.
    return rules;
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.5.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-rule
export function parseRule(
    input: TokenStreamInput,
): ASTQualifiedRule | ASTAtRule {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    nInput.skipWhitespaces();

    // S3.
    const nextInputToken = nInput.nextInputToken();
    let rule;
    if (nextInputToken === undefined) {
        throw new SyntaxError();
    } else if (nextInputToken.kind === "at-keyword") {
        rule = nInput.consumeAtRule();
    } else {
        const tempRule = nInput.consumeQualifiedRule();
        if (tempRule === undefined) {
            throw new SyntaxError();
        }
        rule = tempRule;
    }

    // S4.
    nInput.skipWhitespaces();

    // S5.
    if (nInput.nextInputToken() === undefined) {
        return rule;
    } else {
        throw new SyntaxError();
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.6.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-declaration
export function parseDeclaration(input: TokenStreamInput): ASTDeclaration {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    nInput.skipWhitespaces();

    // S3.
    const nextInputToken = nInput.nextInputToken();
    if (nextInputToken?.kind !== "ident") {
        throw new SyntaxError();
    }

    // S4.
    const decl = nInput.consumeDeclaration();
    if (decl !== undefined) {
        return decl;
    } else {
        throw new SyntaxError();
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.7.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-style-blocks-contents
export function parseStyleBlockContents(
    input: TokenStreamInput,
): (ASTDeclaration | ASTQualifiedRule | ASTAtRule)[] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    return nInput.consumeStyleBlockContents();
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.8.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-declarations
export function parseListOfDeclarations(
    input: TokenStreamInput,
): (ASTDeclaration | ASTAtRule)[] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    return nInput.consumeListOfDeclarations();
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.9.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-component-value
export function parseComponentValue(
    input: TokenStreamInput,
): Token | ASTObject {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    nInput.skipWhitespaces();

    // S3.
    const nextInputToken = nInput.nextInputToken();
    if (nextInputToken === undefined) {
        throw new SyntaxError();
    }

    // S4.
    const value = nInput.consumeComponentValue()!;

    // S5.
    nInput.skipWhitespaces();

    // S6.
    if (nInput.nextInputToken() === undefined) {
        return value;
    } else {
        throw new SyntaxError();
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.10.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-component-values
export function parseListOfComponentValues(
    input: TokenStreamInput,
): (Token | ASTObject)[] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    const values = [];
    while (true) {
        const value = nInput.consumeComponentValue();
        if (value === undefined) {
            break;
        }
        values.push(value);
    }
    return values;
}

//==============================================================================
// CSS Syntax Module Level 3 - 5.3.11.
//==============================================================================
export function parseCommaSeparatedListOfComponentValues(
    input: TokenStreamInput,
): (Token | ASTObject)[][] {
    // S1.
    const nInput = normalizeIntoTokenStream(input);

    // S2.
    const listOfCvls: (Token | ASTObject)[][] = [];

    // S3.
    outerLoop: while (true) {
        const tempList = [];
        while (true) {
            const cvl = nInput.consumeComponentValue();
            if (cvl === undefined) {
                break outerLoop;
            } else if (cvl.kind === "comma") {
                break;
            }
            tempList.push(cvl);
        }
        listOfCvls.push(tempList);
    }

    // S4.
    return listOfCvls;
}

export class TokenStream {
    cursor = 0;
    tokens: (Token | ASTObject)[];

    constructor(tokens: (Token | ASTObject)[]) {
        this.tokens = tokens;
    }

    isEnd(): boolean {
        return this.tokens.length <= this.cursor;
    }

    expectToken<K extends (Token | ASTObject)["kind"]>(
        kind: K,
    ): Extract<Token | ASTObject, { kind: K }> | undefined {
        const oldCursor = this.cursor;
        const tk = this.consumeNextInputToken();
        if (tk === undefined || tk.kind !== kind) {
            this.cursor = oldCursor;
            return undefined;
        }
        return tk as Extract<Token | ASTObject, { kind: K }>;
    }

    expectDelim(d: string): boolean {
        const oldCursor = this.cursor;
        const token = this.expectToken("delim");
        if (token === undefined || token.value !== d) {
            this.cursor = oldCursor;
            return false;
        }
        return true;
    }

    expectIdent(i: string): boolean {
        const oldCursor = this.cursor;
        const token = this.expectToken("ident");
        if (
            token === undefined ||
            toASCIILowercase(token.value) !== toASCIILowercase(i)
        ) {
            this.cursor = oldCursor;
            return false;
        }
        return true;
    }

    expectSimpleBlock(
        openTokenKind: Token["kind"],
    ): ASTSimpleBlock | undefined {
        const oldCursor = this.cursor;
        const token = this.expectToken("ast-simple-block");
        if (
            token === undefined ||
            token.associatedTokenKind !== openTokenKind
        ) {
            this.cursor = oldCursor;
            return undefined;
        }
        return token;
    }

    expectFunction(f: string): ASTFunction | undefined {
        const oldCursor = this.cursor;
        const token = this.expectToken("ast-function");
        if (token === undefined || token.name !== f) {
            this.cursor = oldCursor;
            return undefined;
        }
        return token;
    }

    skipWhitespaces(): void {
        while (true) {
            const oldCursor = this.cursor;
            if (this.expectToken("whitespace") === undefined) {
                this.cursor = oldCursor;
                break;
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.2.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#current-input-token
    currentInputToken(): Token | ASTObject {
        const tok = this.tokens[this.cursor - 1];
        if (tok === undefined) {
            throw new Error(
                "never consumed anything or cursor is at invalid position",
            );
        }
        return tok;
    }

    // https://www.w3.org/TR/css-syntax-3/#next-input-token
    nextInputToken(): Token | ASTObject | undefined {
        if (this.isEnd()) {
            return undefined;
        }
        return this.tokens[this.cursor];
    }

    // https://www.w3.org/TR/css-syntax-3/#consume-the-next-input-token
    consumeNextInputToken(): Token | ASTObject | undefined {
        if (this.isEnd()) {
            return undefined;
        }
        this.cursor++;
        return this.tokens[this.cursor - 1];
    }

    // https://www.w3.org/TR/css-syntax-3/#reconsume-the-current-input-token
    reconsumeCurrentInputToken(): void {
        this.cursor--;
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.1.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-list-of-rules
    consumeListOfRules(topLevel: boolean): (ASTQualifiedRule | ASTAtRule)[] {
        const rules: (ASTQualifiedRule | ASTAtRule)[] = [];

        while (true) {
            const token = this.consumeNextInputToken();
            if (token?.kind === "whitespace") {
                continue;
            } else if (token?.kind === "CDO" || token?.kind === "CDC") {
                if (topLevel) {
                    continue;
                }
                this.reconsumeCurrentInputToken();
                const res = this.consumeQualifiedRule();
                if (res !== undefined) {
                    rules.push(res);
                }
            } else if (token?.kind === "at-keyword") {
                this.reconsumeCurrentInputToken();
                const res = this.consumeAtRule();
                rules.push(res);
            } else {
                this.reconsumeCurrentInputToken();
                const res = this.consumeQualifiedRule();
                if (res !== undefined) {
                    rules.push(res);
                } else {
                    break;
                }
            }
        }
        return rules;
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.2.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-an-at-rule
    consumeAtRule(): ASTAtRule {
        const kwdToken = this.expectToken("at-keyword");
        if (kwdToken === undefined) {
            throw Error("we should have at-keyword at this point");
        }

        const atRule: ASTAtRule = {
            kind: "ast-at-rule",
            name: kwdToken.value,
            prelude: [],
            body: undefined,
        };
        while (true) {
            const token = this.consumeNextInputToken();
            if (token !== undefined && token.kind === "semicolon") {
                return atRule;
            } else if (token === undefined) {
                // PARSE ERROR
                return atRule;
            } else if (token.kind === "{") {
                atRule.body = this.consumeSimpleBlock().value;
                return atRule;
            } else if (
                token.kind === "ast-simple-block" &&
                token.associatedTokenKind === "{"
            ) {
                atRule.body = token.value;
                return atRule;
            } else {
                this.reconsumeCurrentInputToken();
                atRule.prelude.push(this.consumeComponentValue()!);
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.3.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-qualified-rule
    consumeQualifiedRule(): ASTQualifiedRule | undefined {
        const qRule: ASTQualifiedRule = {
            kind: "ast-qualified-rule",
            prelude: [],
            body: [],
        };
        while (true) {
            const token = this.consumeNextInputToken();
            if (token === undefined) {
                // PARSE ERROR
                return undefined;
            } else if (token.kind === "{") {
                qRule.body = this.consumeSimpleBlock().value;
                return qRule;
            } else if (
                token.kind === "ast-simple-block" &&
                token.associatedTokenKind === "{"
            ) {
                qRule.body = token.value;
                return qRule;
            } else {
                this.reconsumeCurrentInputToken();
                qRule.prelude.push(this.consumeComponentValue()!);
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.4.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-style-block
    consumeStyleBlockContents(): (
        | ASTDeclaration
        | ASTQualifiedRule
        | ASTAtRule
    )[] {
        const oldCursor = this.cursor;
        const decls: (ASTDeclaration | ASTQualifiedRule | ASTAtRule)[] = [];
        const rules = [];

        while (true) {
            const token = this.consumeNextInputToken();
            if (token?.kind === "whitespace") {
                continue;
            } else if (token === undefined) {
                decls.push(...rules);
                return decls;
            } else if (token.kind === "at-keyword") {
                this.reconsumeCurrentInputToken();
                const res = this.consumeAtRule();
                decls.push(res);
            } else if (token.kind === "ident") {
                const tokens = [];
                tokens.push(token);

                while (true) {
                    const tempToken = this.consumeNextInputToken();
                    if (tempToken === undefined) {
                        break;
                    }
                    if (tempToken.kind === "semicolon") {
                        this.reconsumeCurrentInputToken();
                        break;
                    }
                    tokens.push(tempToken);
                }
                const innerTs = new TokenStream(tokens);
                innerTs.consumeNextInputToken();
                const decl = innerTs.consumeDeclaration();
                if (decl !== undefined) {
                    decls.push(decl);
                }
            } else if (token.kind === "delim" && token.value === "&") {
                this.cursor = oldCursor;
                const res = this.consumeQualifiedRule();
                if (res !== undefined) {
                    rules.push(res);
                }
            } else {
                // PARSE ERROR
                while (true) {
                    const tempToken = this.consumeNextInputToken();
                    if (tempToken === undefined) {
                        break;
                    }
                    this.reconsumeCurrentInputToken();
                    if (tempToken.kind === "semicolon") {
                        break;
                    }
                    this.consumeComponentValue();
                }
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.5.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-list-of-declarations
    consumeListOfDeclarations(): (ASTDeclaration | ASTAtRule)[] {
        const decls: (ASTDeclaration | ASTAtRule)[] = [];
        while (true) {
            const token = this.consumeNextInputToken();

            if (token?.kind === "whitespace" || token?.kind === "semicolon") {
                continue;
            } else if (token === undefined) {
                return decls;
            } else if (token.kind === "at-keyword") {
                this.reconsumeCurrentInputToken();
                const res = this.consumeAtRule();
                decls.push(res);
            } else if (token.kind === "ident") {
                const tokens = [];
                tokens.push(token);

                while (true) {
                    const tempToken = this.consumeNextInputToken();
                    if (tempToken === undefined) {
                        break;
                    }
                    if (tempToken.kind === "semicolon") {
                        this.reconsumeCurrentInputToken();
                        break;
                    }
                    tokens.push(tempToken);
                }
                const innerTs = new TokenStream(tokens);
                innerTs.consumeNextInputToken();
                const decl = innerTs.consumeDeclaration();
                if (decl !== undefined) {
                    decls.push(decl);
                }
            } else {
                // PARSE ERROR
                while (true) {
                    const tempToken = this.consumeNextInputToken();
                    if (tempToken === undefined) {
                        break;
                    }
                    this.reconsumeCurrentInputToken();
                    if (tempToken.kind === "semicolon") {
                        break;
                    }
                    this.consumeComponentValue();
                }
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.6.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-declaration
    consumeDeclaration(): ASTDeclaration | undefined {
        const currentInputToken = this.currentInputToken();
        if (currentInputToken?.kind !== "ident") {
            throw new Error("current input token must be ident at this point");
        }
        const decl: ASTDeclaration = {
            kind: "ast-declaration",
            name: currentInputToken.value,
            value: [],
            important: false,
        };

        // S1.
        this.skipWhitespaces();

        // S2.
        if (this.expectToken("colon") === undefined) {
            // PARSE ERROR
            return undefined;
        }

        // S3.
        this.skipWhitespaces();

        // S4.
        while (true) {
            const tempTk = this.consumeComponentValue();
            if (tempTk === undefined) {
                break;
            }
            decl.value.push(tempTk);
        }

        // S5.
        const nonWhitespaceIndices = [];
        for (let i = 0; i < decl.value.length; i++) {
            if (decl.value[i]?.kind !== "whitespace") {
                nonWhitespaceIndices.push(i);
            }
        }
        if (2 <= nonWhitespaceIndices.length) {
            const idx1 = nonWhitespaceIndices[nonWhitespaceIndices.length - 2];
            const idx2 = nonWhitespaceIndices[nonWhitespaceIndices.length - 1];
            if (
                idx1 !== undefined &&
                decl.value[idx1]?.kind === "delim" &&
                decl.value[idx1]?.value === "!" &&
                idx2 !== undefined &&
                decl.value[idx2]?.kind === "ident" &&
                decl.value[idx2]?.value == "important"
            ) {
                decl.value.splice(idx2, 1);
                decl.value.splice(idx1, 1);
                decl.important = true;
            }
        }

        // S6.
        this.skipWhitespaces();

        // S7.
        return decl;
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.7.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-component-value
    consumeComponentValue(): Token | ASTObject | undefined {
        const inputToken = this.consumeNextInputToken();

        if (
            inputToken?.kind === "{" ||
            inputToken?.kind === "[" ||
            inputToken?.kind === "("
        ) {
            return this.consumeSimpleBlock();
        } else if (inputToken?.kind === "function") {
            return this.consumeFunction();
        } else {
            return inputToken;
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.8.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-simple-block
    consumeSimpleBlock(): ASTSimpleBlock {
        let endTokenKind;
        const associatedToken = this.currentInputToken();
        switch (associatedToken.kind) {
            case "{":
                endTokenKind = "}";
                break;
            case "[":
                endTokenKind = "]";
                break;
            case "(":
                endTokenKind = ")";
                break;
            default:
                throw new Error("illegal open token kind");
        }
        const block: ASTSimpleBlock = {
            kind: "ast-simple-block",
            associatedTokenKind: associatedToken.kind,
            value: [],
        };
        while (true) {
            const tempTk = this.consumeComponentValue();
            if (tempTk?.kind === endTokenKind) {
                return block;
            } else if (tempTk === undefined) {
                // PARSE ERROR
                return block;
            } else {
                block.value.push(tempTk);
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 5.4.9.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#consume-a-function
    consumeFunction(): ASTFunction {
        const currentInputToken = this.currentInputToken();
        if (currentInputToken?.kind !== "function") {
            throw new Error(
                "current input token must be function at this point",
            );
        }
        const func: ASTFunction = {
            kind: "ast-function",
            name: currentInputToken.value,
            value: [],
        };
        while (true) {
            const tempTk = this.consumeNextInputToken();
            if (tempTk?.kind === ")") {
                return func;
            } else if (tempTk === undefined) {
                // PARSE ERROR
                return func;
            } else {
                this.reconsumeCurrentInputToken();
                func.value.push(this.consumeComponentValue()!);
            }
        }
    }

    //==========================================================================
    // CSS Syntax Module Level 3 - 8.2.
    //==========================================================================

    // https://www.w3.org/TR/css-syntax-3/#typedef-declaration-value
    #consumeDeclarationValue(
        isAnyValue: boolean,
    ): (Token | ASTObject)[] | undefined {
        const oldCursor = this.cursor;
        const res = [];
        const openBlockTokens = [];

        while (true) {
            const token = this.consumeNextInputToken();
            if (token === undefined) {
                break;
            }
            if (
                token.kind === "bad-string" ||
                token.kind === "bad-url" ||
                // https://www.w3.org/TR/css-syntax-3/#typedef-any-value
                (!isAnyValue &&
                    (token.kind === "semicolon" ||
                        (token.kind === "delim" && token.value === "!")))
            ) {
                this.reconsumeCurrentInputToken();
                break;
            }
            // If we have block opening token, push it to the stack.
            if (
                token.kind === "(" ||
                token.kind === "[" ||
                token.kind === "{"
            ) {
                openBlockTokens.push(token.kind);
            } else if (
                // If we have block closing token, see if we have unmatched token.
                token.kind === ")" ||
                token.kind === "]" ||
                token.kind === "}"
            ) {
                if (openBlockTokens.length === 0) {
                    break;
                }
                const last = openBlockTokens[openBlockTokens.length - 1];
                if (
                    (token.kind === ")" && last !== "(") ||
                    (token.kind === "]" && last !== "[") ||
                    (token.kind === "}" && last !== "{")
                ) {
                    break;
                }
            }
            res.push(token);
        }
        if (res.length === 0) {
            this.cursor = oldCursor;
            return undefined;
        }
        return res;
    }

    consumeDeclarationValue(): (Token | ASTObject)[] | undefined {
        return this.#consumeDeclarationValue(false);
    }

    consumeAnyValue(): (Token | ASTObject)[] | undefined {
        return this.#consumeDeclarationValue(true);
    }
}

//==============================================================================
// CSS Syntax Module Level 3 - 9.
//==============================================================================

// https://www.w3.org/TR/css-syntax-3/#parse-a-css-stylesheet
export function parseCSSStyleSheet(
    input: Uint8Array | TokenStreamInput,
    location?: string,
): CSSStyleSheet {
    const rawSheet = parseStylesheet(input, location);
    const sheet = new CSSStyleSheet({ originCleanFlag: true });
    sheet.location = rawSheet.location;
    const styleRules = [];
    for (const token of rawSheet.value) {
        if (token.kind === "ast-qualified-rule") {
            const rule = parseStyleRule(token);
            if (rule !== undefined) {
                styleRules.push(rule);
            } else {
                console.warn(
                    "Ignoring this token because it cannot be parsed as style rule: ",
                    token,
                );
            }
        }
    }
    sheet.cssRules = styleRules;
    return sheet;
}

//==============================================================================
// CSS Syntax Module Level 3 - 9.1.
//==============================================================================
function parseStyleRule(rule: ASTQualifiedRule): StyleRule | undefined {
    let selector;
    {
        const ts = new TokenStream(rule.prelude);
        selector = parseSelector(ts);
        if (selector === undefined) {
            return undefined;
        }
        ts.skipWhitespaces();
        if (!ts.isEnd()) {
            return undefined;
        }
    }

    const styleBlockContents = parseStyleBlockContents(rule.body);
    const declarations = [];
    for (const tk of styleBlockContents) {
        if (tk.kind === "ast-declaration") {
            const desc = PROPERTY_DESCRIPTORS.get(tk.name);
            if (desc === undefined) {
                console.warn(`Unrecognized property ${desc}`);
                continue;
            }
            const ts = new TokenStream(tk.value);
            ts.skipWhitespaces();
            let value: UnfinalizedPropertyValue | undefined;
            if (ts.expectIdent("inherit")) {
                value = new Inherit(tk.name);
            } else if (ts.expectIdent("unset")) {
                value = new Unset(tk.name);
            } else if (ts.expectIdent("initial")) {
                value = new Initial(tk.name);
            } else {
                value = desc.parse(ts);
            }
            if (value === undefined) {
                console.warn(`Illegal value for property ${tk.name}`);
                continue;
            }
            ts.skipWhitespaces();
            if (!ts.isEnd()) {
                console.warn(
                    `Illegal value for property ${tk.name} - Unexpected junk at the end`,
                );
                continue;
            }
            declarations.push(new StyleDeclaration(value, tk.important));
        } else if (tk.kind === "ast-at-rule") {
            continue;
        } else {
            console.warn(
                `Unrecognized token ${tk} encountered during style rule parsing`,
            );
        }
    }

    return new StyleRule(selector, declarations, []);
}
