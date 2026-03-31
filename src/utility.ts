// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    isASCIIWhitespace,
    isASCIIUpperAlpha,
    isASCIILowerAlpha,
} from "./infra.js";

export function removeLeadingWhitespace(s: string) {
    for (let i = 0; ; i++) {
        const cp = s.codePointAt(i);
        if (cp === undefined) {
            return "";
        }
        if (!isASCIIWhitespace(cp)) {
            return s.substring(i);
        }
    }
}
export function removeTrailingWhitespace(s: string) {
    for (let i = s.length - 1; ; i--) {
        const cp = s.codePointAt(i);
        if (cp === undefined) {
            return "";
        }
        if (!isASCIIWhitespace(cp)) {
            return s.substring(0, i + 1);
        }
    }
}
export function removeLeadingAndTrailingWhitespace(s: string) {
    return removeTrailingWhitespace(removeLeadingWhitespace(s));
}
export function toASCIIUppercaseCodePoint(codePoint: number) {
    return !isASCIIUpperAlpha(codePoint) ? codePoint : codePoint - 0x61 + 0x41;
}
export function toASCIILowercaseCodePoint(codePoint: number) {
    return !isASCIILowerAlpha(codePoint) ? codePoint : codePoint - 0x41 + 0x61;
}
export function toCodePoint(v: string | number): number | undefined {
    if (typeof v == "string") {
        return v.codePointAt(0);
    } else {
        return v;
    }
}

export class TextReader {
    str: string;
    cursor = 0;

    constructor(str: string) {
        this.str = str;
    }

    isEnd() {
        return this.str.length <= this.cursor;
    }

    getNextChar(offset: number = 0) {
        const c = this.str.codePointAt(this.cursor + offset);
        if (c === undefined) {
            return "";
        }
        return String.fromCodePoint(c)!;
    }

    getCurrentChar() {
        if (this.cursor === 0) {
            throw new Error("must be called after consuming something");
        }
        const c = this.str.codePointAt(this.cursor - 1);
        if (c === undefined) {
            return "";
        }
        return String.fromCodePoint(c);
    }

    reconsumeChar() {
        if (this.isEnd()) {
            return;
        }
        const c = this.str.codePointAt(this.cursor - 1);
        if (c === undefined) {
            throw new Error("must be called after consuming something");
        }
        this.cursor -= String.fromCodePoint(c).length;
    }

    test(tester: (s: string) => boolean) {
        return tester(this.str.substring(this.cursor));
    }

    startsWith(prefix: string) {
        return this.test((s) => s.startsWith(prefix));
    }

    consumeChars(maxCount: number) {
        const startIdx = this.cursor;
        let len = 0;
        while (len < maxCount) {
            const chr = this.getNextChar();
            if (chr === undefined) {
                break;
            } else {
                this.cursor += chr.length;
                len++;
            }
        }
        const endIdx = startIdx + len;
        return this.str.substring(startIdx, endIdx);
    }

    consumeChar() {
        return this.consumeChars(1);
    }

    static NO_MATCH_FLAGS = 0;
    static ASCII_CASE_INSENSITIVE = 1;

    consumeString(str: string, matchFlags: number) {
        for (let i = 0; i < str.length; i++) {
            let srcChr = str.codePointAt(i);
            let gotChr = this.str.codePointAt(this.cursor + i);
            if (srcChr === undefined || gotChr === undefined) {
                return false;
            }
            if ((matchFlags & TextReader.ASCII_CASE_INSENSITIVE) !== 0) {
                srcChr = toASCIILowercaseCodePoint(srcChr);
                gotChr = toASCIILowercaseCodePoint(gotChr);
            }
            if (srcChr !== gotChr) {
                return false;
            }
        }
        this.cursor += str.length;
        return true;
    }
}
