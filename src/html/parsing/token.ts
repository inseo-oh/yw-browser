// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    isSurrogate,
    isNoncharacter,
    isASCIIWhitespace,
    isASCIIAlpha,
    toASCIILowercase,
    isASCIIDigit,
    isASCIIUpperHexDigit,
    isASCIILowerHexDigit,
    isControl,
    isASCIIHexDigit,
    isASCIIAlphanumeric,
} from "../../infra.js";
import { TextReader, toCodePoint } from "../../utility.js";
import ENTITIES from "./entities.js";

type State =
    | "Data"
    | "RCDATA"
    | "RAWTEXT"
    | "PLAINTEXT"
    | "Tag open"
    | "End tag open"
    | "Tag name"
    | "RCDATA less than sign"
    | "RCDATA end tag open"
    | "RCDATA end tag name"
    | "RAWTEXT less than sign"
    | "RAWTEXT end tag open"
    | "RAWTEXT end tag name"
    | "Before attribute name"
    | "Attribute name"
    | "After attribute name"
    | "Before attribute value"
    | "Attribute value (double-quoted)"
    | "Attribute value (single-quoted)"
    | "Attribute value unquoted"
    | "After attribute value quoted"
    | "Self closing start tag"
    | "Bogus comment"
    | "Markup declaration open"
    | "Comment start"
    | "Comment start dash"
    | "Comment"
    | "Comment less than sign"
    | "Comment end dash"
    | "Comment end"
    | "DOCTYPE"
    | "Before DOCTYPE name"
    | "DOCTYPE name"
    | "After DOCTYPE name"
    | "After DOCTYPE public keyword"
    | "Before DOCTYPE public identifier"
    | "DOCTYPE public identifier (double-quoted)"
    | "DOCTYPE public identifier (single-quoted)"
    | "After DOCTYPE public identifier"
    | "between DOCTYPE public and system identifiers"
    | "After DOCTYPE system keyword"
    | "Before DOCTYPE system identifier"
    | "DOCTYPE system identifier (double-quoted)"
    | "DOCTYPE system identifier (single-quoted)"
    | "After DOCTYPE system identifier"
    | "Character reference"
    | "Named character reference"
    | "Numeric character reference"
    | "Hexadecimal character reference start"
    | "Decimal character reference start"
    | "Hexadecimal character reference"
    | "Decimal character reference"
    | "Numeric character reference end";

export type Token =
    | { kind: "eof" }
    | { kind: "character"; data: string }
    | { kind: "comment"; data: string }
    | {
          kind: "doctype";
          name: string | null;
          publicID: string | null;
          systemID: string | null;
          // https://html.spec.whatwg.org/multipage/parsing.html#force-quirks-flag
          forceQuirks: boolean;
      }
    | {
          kind: "tag";
          name: string;
          attributes: {
              localName: string;
              value: string;
              namespace: string | null;
              namespacePrefix: string | null;
          }[];
          isEnd: boolean;
          // https://html.spec.whatwg.org/multipage/parsing.html#self-closing-flag
          isSelfClosing: boolean;
          attributeIndicesToRemove: number[];
      };

export function makeToken<K extends Token["kind"]>(
    kind: K,
): Extract<Token, { kind: K }> {
    let res: Token;
    switch (kind) {
        case "eof":
            res = { kind: "eof" };
            break;
        case "character":
            res = makeCharToken("");
            break;
        case "comment":
            res = { kind: "comment", data: "" };
            break;
        case "doctype":
            res = {
                kind: "doctype",
                name: null,
                publicID: null,
                systemID: null,
                forceQuirks: false,
            };
            break;
        case "tag":
            res = {
                kind: "tag",
                name: "",
                attributes: [],
                isEnd: false,
                isSelfClosing: false,
                attributeIndicesToRemove: [],
            };
            break;
    }
    return res as Extract<Token, { kind: K }>;
}
export function makeCharToken(
    char: string,
): Extract<Token, { kind: "character" }> {
    const token = makeToken("character");
    token.data = char;
    return token;
}

export function serializeTokens(tokens: Token[]): string {
    return tokens.map((x) => serializeToken(x)).join("");
}
export function serializeToken(token: Token): string {
    switch (token.kind) {
        case "eof":
            return "";
        case "character":
            return token.data;
        case "comment":
            return `<!--${token.data}-->`;
        case "doctype": {
            let res = "<!DOCTYPE";
            if (token.name !== null) {
                res += ` ${token.name}`;
            }
            if (token.publicID !== null && token.systemID !== null) {
                res += ` PUBLIC ${token.publicID} ${token.systemID}`;
            } else if (token.publicID !== null && token.systemID === null) {
                res += ` PUBLIC ${token.publicID}`;
            } else if (token.publicID === null && token.systemID !== null) {
                res += ` SYSTEM ${token.publicID}`;
            }
            res += ">";
            return res;
        }
        case "tag": {
            let res = "<";
            if (token.isEnd) {
                res += "/";
            }
            res += token.name;
            for (const attr of token.attributes) {
                if (attr.value.indexOf('"') < 0) {
                    res += ` ${attr.localName}="${attr.value}"`;
                } else {
                    res += ` ${attr.localName}='${attr.value}'`;
                }
            }
            res += ">";
            return res;
        }
    }
}

export function tokenize(
    source: string,
    emitCallback: (tokenizer: Tokenizer, token: Token) => void,
) {
    const tkr = new Tokenizer(source, emitCallback);
    while (!tkr.eofEmitted) {
        tkr.runTokenizer();
    }
}
export class Tokenizer {
    lastStartTagName: string = "";
    state: State = "Data";
    currentToken: Token = makeToken("eof"); // DUMMY
    eofEmitted = false;
    tr: TextReader;
    emitCallback: (tokenizer: Tokenizer, token: Token) => void;

    constructor(
        source: string,
        emitCallback: (tokenizer: Tokenizer, token: Token) => void,
    ) {
        this.tr = new TextReader(source);
        this.emitCallback = emitCallback;
    }

    emitToken(tk: Token) {
        if (tk.kind === "tag") {
            if (tk.attributeIndicesToRemove.length !== 0) {
                const newAttrs = [];
                for (let i = 0; i < tk.attributes.length; i++) {
                    let isBadAttr = false;
                    for (
                        let j = 0;
                        j < tk.attributeIndicesToRemove.length;
                        j++
                    ) {
                        if (tk.attributeIndicesToRemove[j] === i) {
                            isBadAttr = true;
                            break;
                        }
                    }
                    if (!isBadAttr) {
                        newAttrs.push(tk.attributes[i]!);
                    }
                }
                tk.attributes = [];
                tk.attributes.push(...newAttrs);
            }
            if (!tk.isEnd) {
                this.lastStartTagName = tk.name;
            }
        } else if (tk.kind === "eof") {
            this.eofEmitted = true;
        }
        this.emitCallback(this, tk);
    }

    currentAttribute() {
        const tag = this.currentToken;
        if (tag.kind !== "tag") {
            throw new Error("current token is not tag token");
        }
        const attr = tag.attributes[tag.attributes.length - 1];
        if (attr === undefined) {
            throw new Error("current tag token has no attributes");
        }
        return attr;
    }

    addAttrToCurrentTag(name: string, value: string) {
        const tag = this.currentToken;
        if (tag.kind !== "tag") {
            throw new Error("current token is not tag token");
        }
        const attr: {
            localName: string;
            value: string;
            namespace: string | null;
            namespacePrefix: string | null;
        } = {
            localName: name,
            value: value,
            namespace: null,
            namespacePrefix: null,
        };
        tag.attributes.push(attr);
    }

    //==========================================================================
    // HTML Standard - 13.2.1.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#parser-pause-flag
    parserPauseFlag = false;

    //==========================================================================
    // HTML Standard - 13.2.5.
    //==========================================================================

    // https://html.spec.whatwg.org/multipage/parsing.html#temporary-buffer
    tempBuf = "";

    // https://html.spec.whatwg.org/multipage/parsing.html#return-state
    returnState: State = "Data"; // DUMMY

    // https://html.spec.whatwg.org/multipage/parsing.html#appropriate-end-tag-token
    isAppropriateEndTagToken(tk: Token): boolean {
        if (tk.kind !== "tag") {
            return false;
        }
        if (!tk.isEnd) {
            return false;
        }
        return this.lastStartTagName === tk.name;
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#charref-in-attribute
    isConsumedAsPartOfAttr(): boolean {
        return (
            this.returnState === "Attribute value (double-quoted)" ||
            this.returnState === "Attribute value (single-quoted)" ||
            this.returnState === "Attribute value unquoted"
        );
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#flush-code-points-consumed-as-a-character-reference
    flushCodepointsConsumedAsCharReference() {
        if (this.isConsumedAsPartOfAttr()) {
            this.currentAttribute().value += this.tempBuf;
        } else {
            const length = this.tempBuf.length;
            for (let offset = 0; offset < length; ) {
                const codePoint = this.tempBuf.codePointAt(offset)!;
                this.emitToken({
                    kind: "character",
                    data: String.fromCodePoint(codePoint),
                });
                offset += String.fromCodePoint(codePoint).length;
            }
        }
    }

    // https://html.spec.whatwg.org/multipage/parsing.html#character-reference-code
    characterReferenceCode = 0;

    runTokenizer() {
        if (this.parserPauseFlag) {
            throw new Error("TODO");
        }
        switch (this.state) {
            case "Data": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "&":
                        this.returnState = "Data";
                        this.state = "Character reference";
                        break;
                    case "<":
                        this.state = "Tag open";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.emitToken({
                            kind: "character",
                            data: nextChar,
                        });
                        break;
                    case "":
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.emitToken({
                            kind: "character",
                            data: nextChar,
                        });
                        break;
                }
                break;
            }
            case "RCDATA": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "&":
                        this.returnState = "RCDATA";
                        this.state = "Character reference";
                        break;
                    case "<":
                        this.state = "RCDATA less than sign";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.emitToken({
                            kind: "character",
                            data: "\ufffd",
                        });
                        break;
                    case "":
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.emitToken({
                            kind: "character",
                            data: nextChar,
                        });
                        break;
                }
                break;
            }
            case "RAWTEXT": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "<":
                        this.state = "RAWTEXT less than sign";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.emitToken({
                            kind: "character",
                            data: "\ufffd",
                        });
                        break;
                    case "":
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.emitToken({
                            kind: "character",
                            data: nextChar,
                        });
                        break;
                }
                break;
            }
            case "PLAINTEXT": {
                // TODO: PLAINTEXT
                throw new Error("TODO");
            }
            case "Tag open": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "!":
                        this.state = "Markup declaration open";
                        break;
                    case "/":
                        this.state = "End tag open";
                        break;
                    case "?":
                        // PARSE ERROR
                        this.currentToken = makeToken("comment");
                        this.tr.cursor = oldCursor;
                        this.state = "Bogus comment";
                        break;
                    case "":
                        this.emitToken(makeCharToken("<"));
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        if (isASCIIAlpha(toCodePoint(nextChar))) {
                            this.currentToken = makeToken("tag");
                            this.tr.cursor = oldCursor;
                            this.state = "Tag name";
                        } else {
                            // PARSE ERROR
                            this.emitToken({
                                kind: "character",
                                data: "<",
                            });
                            this.tr.cursor = oldCursor;
                            this.state = "Data";
                        }
                }
                break;
            }
            case "End tag open": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case ">":
                        // PARSE ERROR
                        this.state = "Data";
                        break;
                    case "":
                        this.emitToken(makeCharToken("<"));
                        this.emitToken(makeCharToken("/"));
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        if (isASCIIAlpha(toCodePoint(nextChar))) {
                            this.currentToken = makeToken("tag");
                            this.currentToken.isEnd = true;
                            this.tr.cursor = oldCursor;
                            this.state = "Tag name";
                        } else {
                            // PARSE ERROR
                            this.currentToken = makeToken("comment");
                            this.tr.cursor = oldCursor;
                            this.state = "Bogus comment";
                        }
                }
                break;
            }
            case "Tag name": {
                const nextChar = this.tr.consumeChar();
                if (this.currentToken.kind !== "tag") {
                    throw new Error("current token is not tag token");
                }
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "Before attribute name";
                        break;
                    case "/":
                        this.state = "Self closing start tag";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentToken.name += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default: {
                        const chr = toASCIILowercase(nextChar);
                        this.currentToken.name += chr;
                    }
                }
                break;
            }
            case "RCDATA less than sign": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "/":
                        this.tempBuf = "";
                        this.state = "RCDATA end tag open";
                        break;
                    default:
                        this.emitToken(makeCharToken("<"));
                        this.tr.cursor = oldCursor;
                        this.state = "RCDATA";
                }
                break;
            }
            case "RCDATA end tag open": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                if (
                    nextChar !== undefined &&
                    isASCIIAlpha(toCodePoint(nextChar))
                ) {
                    this.currentToken = makeToken("tag");
                    this.currentToken.isEnd = true;
                    this.tr.cursor = oldCursor;
                    this.state = "RCDATA end tag name";
                } else {
                    this.emitToken(makeCharToken("<"));
                    this.emitToken(makeCharToken("/"));
                    this.tr.cursor = oldCursor;
                    this.state = "RCDATA";
                }
                break;
            }
            case "RCDATA end tag name": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                const anythingElse = () => {
                    this.emitToken(makeCharToken("<"));
                    this.emitToken(makeCharToken("/"));
                    for (const c of this.tempBuf) {
                        this.emitToken(makeCharToken(c));
                    }
                    this.tr.cursor = oldCursor;
                    this.state = "RCDATA";
                };

                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Before attribute name";
                            break;
                        }
                        anythingElse();
                        break;
                    case "/":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Self closing start tag";
                            break;
                        }
                        anythingElse();
                        break;
                    case ">":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Data";
                            this.emitToken(this.currentToken);
                            break;
                        }
                        anythingElse();
                        break;
                    default:
                        if (
                            nextChar !== undefined &&
                            isASCIIAlpha(toCodePoint(nextChar))
                        ) {
                            const chr = toASCIILowercase(nextChar);
                            this.tempBuf += chr;
                            break;
                        }
                        anythingElse();
                }
                break;
            }
            case "RAWTEXT less than sign": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "/":
                        this.tempBuf = "";
                        this.state = "RAWTEXT end tag open";
                        break;
                    default:
                        this.emitToken(makeCharToken("<"));
                        this.tr.cursor = oldCursor;
                        this.state = "RAWTEXT";
                }
                break;
            }
            case "RAWTEXT end tag open": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                if (
                    nextChar !== undefined &&
                    isASCIIAlpha(toCodePoint(nextChar))
                ) {
                    this.currentToken = makeToken("tag");
                    this.currentToken.isEnd = true;
                    this.tr.cursor = oldCursor;
                    this.state = "RAWTEXT end tag name";
                } else {
                    this.emitToken(makeCharToken("<"));
                    this.emitToken(makeCharToken("/"));
                    this.tr.cursor = oldCursor;
                    this.state = "RAWTEXT";
                }
                break;
            }
            case "RAWTEXT end tag name": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();

                const anythingElse = () => {
                    this.emitToken(makeCharToken("<"));
                    this.emitToken(makeCharToken("/"));
                    for (const c of this.tempBuf) {
                        this.emitToken(makeCharToken(c));
                    }
                    this.tr.cursor = oldCursor;
                    this.state = "RAWTEXT";
                };

                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Before attribute name";
                            break;
                        }
                        anythingElse();
                        break;
                    case "/":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Self closing start tag";
                            break;
                        }
                        anythingElse();
                        break;
                    case ">":
                        if (this.isAppropriateEndTagToken(this.currentToken)) {
                            this.state = "Data";
                            this.emitToken(this.currentToken);
                            break;
                        }
                        anythingElse();
                        break;
                    default:
                        if (
                            nextChar !== undefined &&
                            isASCIIAlpha(toCodePoint(nextChar))
                        ) {
                            const chr = toASCIILowercase(nextChar);
                            this.tempBuf += chr;
                            break;
                        }
                        anythingElse();
                }
                break;
            }

            case "Before attribute name": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case "/":
                    case ">":
                    case "":
                        this.tr.cursor = oldCursor;
                        this.state = "After attribute name";
                        break;
                    case "=": {
                        const nameStr = nextChar;
                        this.addAttrToCurrentTag(nameStr, "");
                        this.tr.cursor = oldCursor;
                        this.state = "Attribute name";
                        break;
                    }
                    default:
                        this.addAttrToCurrentTag("", "");
                        this.tr.cursor = oldCursor;
                        this.state = "Attribute name";
                        break;
                }
                break;
            }
            case "Attribute name": {
                if (this.currentToken.kind !== "tag") {
                    throw new Error("current token is not tag token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                const anythingElse = () => {
                    this.currentAttribute().localName += nextChar;
                };
                const checkDupliateAttrName = () => {
                    const tag = this.currentToken;
                    if (tag.kind !== "tag") {
                        throw new Error("current token is not tag token");
                    }
                    const currentAttr = this.currentAttribute();
                    for (let i = 0; i < tag.attributes.length; i++) {
                        const attr = tag.attributes[i]!;
                        if (attr === currentAttr) {
                            continue;
                        }
                        if (currentAttr.localName == attr.localName) {
                            tag.attributeIndicesToRemove.push(i);
                        }
                    }
                };

                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                    case "/":
                    case ">":
                    case "":
                        this.tr.cursor = oldCursor;
                        this.state = "After attribute name";
                        checkDupliateAttrName();
                        break;
                    case "=":
                        this.state = "Before attribute value";
                        checkDupliateAttrName();
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentAttribute().localName += "\ufffd";
                        break;
                    case '"':
                    case "\\":
                    case "<":
                        // PARSE ERROR
                        anythingElse();
                        break;
                    default:
                        anythingElse();
                        break;
                }
                break;
            }
            case "After attribute name": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case "/":
                        this.state = "Self closing start tag";
                        break;
                    case "=":
                        this.state = "Before attribute name";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.addAttrToCurrentTag("", "");
                        this.tr.cursor = oldCursor;
                        this.state = "Attribute name";
                        break;
                }
                break;
            }
            case "Before attribute value": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case '"':
                        this.state = "Attribute value (double-quoted)";
                        break;
                    case "'":
                        this.state = "Attribute value (single-quoted)";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.state = "Data";
                        break;
                    default:
                        this.tr.cursor = oldCursor;
                        this.state = "Attribute value unquoted";
                }
                break;
            }
            case "Attribute value (double-quoted)": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        this.state = "After attribute value quoted";
                        break;
                    case "&":
                        this.returnState = "Attribute value (double-quoted)";
                        this.state = "Character reference";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentAttribute().value += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentAttribute().value += nextChar;
                        break;
                }
                break;
            }
            case "Attribute value (single-quoted)": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "'":
                        this.state = "After attribute value quoted";
                        break;
                    case "&":
                        this.returnState = "Attribute value (single-quoted)";
                        this.state = "Character reference";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentAttribute().value += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentAttribute().value += nextChar;
                        break;
                }
                break;
            }
            case "Attribute value unquoted": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "Before attribute name";
                        break;
                    case "&":
                        this.returnState = "Attribute value unquoted";
                        this.state = "Character reference";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentAttribute().value += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentAttribute().value += nextChar;
                        break;
                }
                break;
            }
            case "After attribute value quoted": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "Before attribute name";
                        break;
                    case "/":
                        this.state = "Self closing start tag";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.tr.cursor = oldCursor;
                        this.state = "Before attribute name";
                        break;
                }
                break;
            }
            case "Self closing start tag": {
                if (this.currentToken.kind !== "tag") {
                    throw new Error("current token is not tag token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case ">":
                        this.currentToken.isSelfClosing = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.tr.cursor = oldCursor;
                        this.state = "Before attribute name";
                        break;
                }
                break;
            }
            case "Bogus comment": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentToken.data += "\ufffd";
                        break;
                    default:
                        this.currentToken.data += nextChar;
                        break;
                }
                break;
            }
            case "Markup declaration open": {
                if (this.tr.consumeString("--", TextReader.NO_MATCH_FLAGS)) {
                    this.currentToken = makeToken("comment");
                    this.state = "Comment start";
                } else if (
                    this.tr.consumeString(
                        "doctype",
                        TextReader.ASCII_CASE_INSENSITIVE,
                    )
                ) {
                    this.state = "DOCTYPE";
                } else if (
                    this.tr.consumeString("[CDATA[", TextReader.NO_MATCH_FLAGS)
                ) {
                    throw new Error("TODO");
                } else {
                    // PARSE ERROR
                    this.currentToken = makeToken("comment");
                    this.state = "Bogus comment";
                }
                break;
            }
            case "Comment start": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "-":
                        this.state = "Comment start dash";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    default:
                        this.tr.cursor = oldCursor;
                        this.state = "Comment";
                        break;
                }
                break;
            }
            case "Comment start dash": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "-":
                        this.state = "Comment end";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.data += "-";
                        this.tr.cursor = oldCursor;
                        this.state = "Comment";
                        break;
                }
                break;
            }
            case "Comment": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "<":
                        this.currentToken.data += "<";
                        this.state = "Comment less than sign";
                        break;
                    case "-":
                        this.state = "Comment end dash";
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentToken.data += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.data += nextChar;
                        break;
                }
                break;
            }
            case "Comment less than sign": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "!":
                        this.currentToken.data += nextChar;
                        throw new Error("TODO");
                    /* state = "COMMENT_LESS_THAN_SIGN_BANG"; */
                    case "<":
                        this.currentToken.data += nextChar;
                        break;
                    default:
                        this.tr.cursor = oldCursor;
                        this.state = "Comment";
                        break;
                }
                break;
            }
            case "Comment end dash": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "-":
                        this.state = "Comment end";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.data += "-";
                        this.tr.cursor = oldCursor;
                        this.state = "Comment";
                        break;
                }
                break;
            }
            case "Comment end": {
                if (this.currentToken.kind !== "comment") {
                    throw new Error("current token is not comment token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "!":
                        throw new Error("TODO");
                    // state = "COMMENT_END_BANG";
                    case "":
                        // PARSE ERROR
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.data += "--";
                        this.tr.cursor = oldCursor;
                        this.state = "Bogus comment";
                        break;
                }
                break;
            }
            case "DOCTYPE": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "Before DOCTYPE name";
                        break;
                    case ">":
                        this.tr.cursor = oldCursor;
                        this.state = "Before DOCTYPE name";
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken({
                            kind: "doctype",
                            name: null,
                            publicID: null,
                            systemID: null,
                            forceQuirks: false,
                        });
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.tr.cursor = oldCursor;
                        this.state = "Before DOCTYPE name";
                        break;
                }
                break;
            }
            case "Before DOCTYPE name": {
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentToken = {
                            kind: "doctype",
                            name: null,
                            publicID: null,
                            systemID: null,
                            forceQuirks: false,
                        };
                        this.currentToken.name += "\ufffd";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken = {
                            kind: "doctype",
                            name: null,
                            publicID: null,
                            systemID: null,
                            forceQuirks: false,
                        };
                        this.currentToken.forceQuirks = true;
                        break;
                    case "":
                        // PARSE ERROR
                        this.emitToken({
                            kind: "doctype",
                            name: null,
                            publicID: null,
                            systemID: null,
                            forceQuirks: false,
                        });
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken = {
                            kind: "doctype",
                            name: null,
                            publicID: null,
                            systemID: null,
                            forceQuirks: false,
                        };
                        this.currentToken.name = toASCIILowercase(nextChar);
                        this.state = "DOCTYPE name";
                }
                break;
            }
            case "DOCTYPE name": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "After DOCTYPE name";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "\0":
                        // PARSE ERROR
                        this.currentToken.name += "\ufffd";
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.name += toASCIILowercase(nextChar);
                        break;
                }
                break;
            }
            case "After DOCTYPE name": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.tr.cursor = oldCursor;
                        if (
                            this.tr.consumeString(
                                "PUBLIC",
                                TextReader.ASCII_CASE_INSENSITIVE,
                            )
                        ) {
                            this.state = "After DOCTYPE public keyword";
                        } else if (
                            this.tr.consumeString(
                                "SYSTEM",
                                TextReader.ASCII_CASE_INSENSITIVE,
                            )
                        ) {
                            this.state = "After DOCTYPE system keyword";
                        } else {
                            // PARSE ERROR
                            this.currentToken.forceQuirks = true;
                            throw new Error("TODO");
                            /* state = "BOGUS_DOCTYPE"; */
                        }
                }
                break;
            }
            case "After DOCTYPE public keyword": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "After DOCTYPE public identifier";
                        break;
                    case '"':
                        // PARSE ERROR
                        this.currentToken.publicID = "";
                        this.state =
                            "DOCTYPE public identifier (double-quoted)";
                        break;
                    case "'":
                        // PARSE ERROR
                        this.currentToken.publicID = "";
                        this.state =
                            "DOCTYPE public identifier (single-quoted)";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = "BOGUS_DOCTYPE"; */
                }
                break;
            }
            case "Before DOCTYPE public identifier": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case '"':
                        this.currentToken.publicID = "";
                        this.state =
                            "DOCTYPE public identifier (double-quoted)";
                        break;
                    case "'":
                        this.currentToken.publicID = "";
                        this.state =
                            "DOCTYPE public identifier (single-quoted)";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = "BOGUS_DOCTYPE"; */
                }
                break;
            }
            case "DOCTYPE public identifier (double-quoted)": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        this.state = "After DOCTYPE public identifier";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.publicID += nextChar;
                        break;
                }
                break;
            }
            case "DOCTYPE public identifier (single-quoted)": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "'":
                        this.state = "After DOCTYPE public identifier";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.publicID += nextChar;
                        break;
                }
                break;
            }
            case "After DOCTYPE public identifier": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state =
                            "between DOCTYPE public and system identifiers";
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case '"':
                        // PARSE ERROR
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (double-quoted)";
                        break;
                    case "'":
                        // PARSE ERROR
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (single-quoted)";
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = BOGUS_DOCTYPE; */
                }
                break;
            }
            case "between DOCTYPE public and system identifiers": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case '"':
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (double-quoted)";
                        break;
                    case "'":
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (single-quoted)";
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = "BOGUS_DOCTYPE"; */
                }
                break;
            }
            case "After DOCTYPE system keyword": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        this.state = "Before DOCTYPE system identifier";
                        break;
                    case '"':
                        // PARSE ERROR
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (double-quoted)";
                        break;
                    case "'":
                        // PARSE ERROR
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (single-quoted)";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = "BOGUS_DOCTYPE"; */
                }
                break;
            }
            case "Before DOCTYPE system identifier": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case '"':
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (double-quoted)";
                        break;
                    case "'":
                        this.currentToken.systemID = "";
                        this.state =
                            "DOCTYPE system identifier (single-quoted)";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = "BOGUS_DOCTYPE"; */
                }
                break;
            }
            case "DOCTYPE system identifier (double-quoted)": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        this.state = "After DOCTYPE system identifier";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.systemID += nextChar;
                        break;
                }
                break;
            }
            case "DOCTYPE system identifier (single-quoted)": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "'":
                        this.state = "After DOCTYPE system identifier";
                        break;
                    case ">":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        this.currentToken.systemID += nextChar;
                        break;
                }
                break;
            }
            case "After DOCTYPE system identifier": {
                if (this.currentToken.kind !== "doctype") {
                    throw new Error("current token is not DOCTYPE token");
                }
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "\t":
                    case "\n":
                    case "\f":
                    case " ":
                        break;
                    case ">":
                        this.state = "Data";
                        this.emitToken(this.currentToken);
                        break;
                    case "":
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.emitToken(this.currentToken);
                        this.emitToken(makeToken("eof"));
                        break;
                    default:
                        // PARSE ERROR
                        this.currentToken.forceQuirks = true;
                        this.tr.cursor = oldCursor;
                        throw new Error("TODO");
                    /* state = BOGUS_DOCTYPE; */
                }
                break;
            }
            case "Character reference": {
                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                this.tempBuf = "&";
                switch (nextChar) {
                    case "#":
                        this.tempBuf += nextChar;
                        this.state = "Numeric character reference";
                        break;
                    default:
                        if (isASCIIAlphanumeric(toCodePoint(nextChar))) {
                            this.tr.cursor = oldCursor;
                            this.state = "Named character reference";
                        } else {
                            this.flushCodepointsConsumedAsCharReference();
                            this.tr.cursor = oldCursor;
                            this.state = this.returnState;
                        }
                }
                break;
            }
            case "Named character reference": {
                let foundNameAndStr: [string, string] | null = null;
                let cursorAfterFound = -1;
                for (const name in ENTITIES) {
                    if (!name.startsWith("&")) {
                        console.warn(
                            `internal warning: key ${name} from ENTRIES doesn't start with &`,
                        );
                        continue;
                    }
                    const cursorBeforeStr = this.tr.cursor;
                    if (
                        this.tr.consumeString(
                            name.substring(1),
                            TextReader.NO_MATCH_FLAGS,
                        )
                    ) {
                        if (
                            foundNameAndStr === null ||
                            foundNameAndStr[0].length < name.length
                        ) {
                            foundNameAndStr = [
                                name,
                                ENTITIES[name as keyof typeof ENTITIES]
                                    .characters,
                            ];
                            cursorAfterFound = this.tr.cursor;
                        }
                        this.tr.cursor = cursorBeforeStr;
                    }
                }
                if (foundNameAndStr !== null) {
                    console.assert(cursorAfterFound !== -1);
                    this.tr.cursor = cursorAfterFound;
                    if (
                        this.isConsumedAsPartOfAttr() &&
                        foundNameAndStr[0].charAt(
                            foundNameAndStr[0].length - 1,
                        ) !== ";" &&
                        (this.tr.getNextChar() === "=" ||
                            isASCIIAlphanumeric(
                                toCodePoint(this.tr.getNextChar()),
                            ))
                    ) {
                        this.flushCodepointsConsumedAsCharReference();
                        this.state = this.returnState;
                    } else {
                        if (
                            foundNameAndStr[0].charAt(
                                foundNameAndStr[0].length - 1,
                            ) !== ";"
                        ) {
                            // PARSE ERROR
                        }
                        this.tempBuf = foundNameAndStr[1];
                        this.flushCodepointsConsumedAsCharReference();
                        this.state = this.returnState;
                    }
                } else {
                    this.flushCodepointsConsumedAsCharReference();
                    this.state = this.returnState;
                }
                break;
            }
            case "Numeric character reference": {
                this.characterReferenceCode = 0;

                const oldCursor = this.tr.cursor;
                const nextChar = this.tr.consumeChar();
                switch (nextChar) {
                    case "X":
                    case "x":
                        this.tempBuf += nextChar;
                        this.state = "Hexadecimal character reference start";
                        break;
                    default:
                        this.tr.cursor = oldCursor;
                        this.state = "Decimal character reference start";
                        break;
                }
                break;
            }
            case "Hexadecimal character reference start": {
                const oldCursor = this.tr.cursor;
                const nextCharCodePoint = toCodePoint(this.tr.consumeChar());
                if (
                    nextCharCodePoint !== undefined &&
                    isASCIIHexDigit(nextCharCodePoint)
                ) {
                    this.tr.cursor = oldCursor;
                    this.state = "Hexadecimal character reference";
                } else {
                    // PARSE ERROR
                    this.tr.cursor = oldCursor;
                    this.state = this.returnState;
                }
                break;
            }
            case "Decimal character reference start": {
                const oldCursor = this.tr.cursor;
                const nextCharCodePoint = toCodePoint(this.tr.consumeChar());
                if (
                    nextCharCodePoint !== undefined &&
                    isASCIIDigit(nextCharCodePoint)
                ) {
                    this.tr.cursor = oldCursor;
                    this.state = "Decimal character reference";
                } else {
                    // PARSE ERROR
                    this.tr.cursor = oldCursor;
                    this.state = this.returnState;
                }
                break;
            }
            case "Hexadecimal character reference": {
                const oldCursor = this.tr.cursor;
                const nextCharCodePoint = toCodePoint(this.tr.consumeChar());
                if (
                    nextCharCodePoint !== undefined &&
                    isASCIIDigit(toCodePoint(nextCharCodePoint))
                ) {
                    this.characterReferenceCode =
                        this.characterReferenceCode * 16 +
                        (nextCharCodePoint - 0x0030);
                } else if (
                    nextCharCodePoint !== undefined &&
                    isASCIIUpperHexDigit(nextCharCodePoint)
                ) {
                    this.characterReferenceCode =
                        this.characterReferenceCode * 16 +
                        (nextCharCodePoint - 0x0041 + 10);
                } else if (
                    nextCharCodePoint !== undefined &&
                    isASCIILowerHexDigit(nextCharCodePoint)
                ) {
                    this.characterReferenceCode =
                        this.characterReferenceCode * 16 +
                        (nextCharCodePoint - 0x0061 + 10);
                } else if (
                    nextCharCodePoint !== undefined &&
                    nextCharCodePoint === 0x0059
                ) {
                    this.state = "Numeric character reference end";
                } else {
                    // PARSE ERROR
                    this.tr.cursor = oldCursor;
                    this.state = "Numeric character reference end";
                }
                break;
            }
            case "Decimal character reference": {
                const oldCursor = this.tr.cursor;
                const nextCharCodePoint = toCodePoint(this.tr.consumeChar());
                if (
                    nextCharCodePoint !== undefined &&
                    isASCIIDigit(nextCharCodePoint)
                ) {
                    this.characterReferenceCode =
                        this.characterReferenceCode * 10 +
                        (nextCharCodePoint - 0x0030);
                } else if (nextCharCodePoint === 0x003b) {
                    this.state = "Numeric character reference end";
                } else {
                    // PARSE ERROR
                    this.tr.cursor = oldCursor;
                    this.state = "Numeric character reference end";
                }
                break;
            }
            case "Numeric character reference end": {
                if (this.characterReferenceCode === 0x0000) {
                    // PARSE ERROR
                    this.characterReferenceCode = 0xfffd;
                } else if (0x10ffff < this.characterReferenceCode) {
                    // PARSE ERROR
                    this.characterReferenceCode = 0xfffd;
                } else if (isSurrogate(this.characterReferenceCode)) {
                    // PARSE ERROR
                    this.characterReferenceCode = 0xfffd;
                } else if (isNoncharacter(this.characterReferenceCode)) {
                    // PARSE ERROR
                } else if (
                    this.characterReferenceCode === 0x0d ||
                    (isControl(this.characterReferenceCode) &&
                        !isASCIIWhitespace(this.characterReferenceCode))
                ) {
                    // PARSE ERROR
                    switch (this.characterReferenceCode) {
                        case 0x80:
                            this.characterReferenceCode = 0x20ac;
                            break;
                        case 0x82:
                            this.characterReferenceCode = 0x201a;
                            break;
                        case 0x83:
                            this.characterReferenceCode = 0x0192;
                            break;
                        case 0x84:
                            this.characterReferenceCode = 0x201e;
                            break;
                        case 0x85:
                            this.characterReferenceCode = 0x2026;
                            break;
                        case 0x86:
                            this.characterReferenceCode = 0x2020;
                            break;
                        case 0x87:
                            this.characterReferenceCode = 0x2021;
                            break;
                        case 0x88:
                            this.characterReferenceCode = 0x02c6;
                            break;
                        case 0x89:
                            this.characterReferenceCode = 0x2030;
                            break;
                        case 0x8a:
                            this.characterReferenceCode = 0x0160;
                            break;
                        case 0x8b:
                            this.characterReferenceCode = 0x2039;
                            break;
                        case 0x8c:
                            this.characterReferenceCode = 0x0152;
                            break;
                        case 0x8e:
                            this.characterReferenceCode = 0x017d;
                            break;
                        case 0x91:
                            this.characterReferenceCode = 0x2018;
                            break;
                        case 0x92:
                            this.characterReferenceCode = 0x2019;
                            break;
                        case 0x93:
                            this.characterReferenceCode = 0x201c;
                            break;
                        case 0x94:
                            this.characterReferenceCode = 0x201d;
                            break;
                        case 0x95:
                            this.characterReferenceCode = 0x2022;
                            break;
                        case 0x96:
                            this.characterReferenceCode = 0x2013;
                            break;
                        case 0x97:
                            this.characterReferenceCode = 0x2014;
                            break;
                        case 0x98:
                            this.characterReferenceCode = 0x02dc;
                            break;
                        case 0x99:
                            this.characterReferenceCode = 0x2122;
                            break;
                        case 0x9a:
                            this.characterReferenceCode = 0x0161;
                            break;
                        case 0x9b:
                            this.characterReferenceCode = 0x203a;
                            break;
                        case 0x9c:
                            this.characterReferenceCode = 0x0153;
                            break;
                        case 0x9e:
                            this.characterReferenceCode = 0x017e;
                            break;
                        case 0x9f:
                            this.characterReferenceCode = 0x0178;
                            break;
                    }
                }
                this.tempBuf = String.fromCodePoint(
                    this.characterReferenceCode,
                );
                this.flushCodepointsConsumedAsCharReference();
                this.state = this.returnState;
                break;
            }
        }
    }
}
