export class SyntaxError extends Error {
    constructor(msg: string, options?: ErrorOptions) {
        super(msg, options);
    }
}

export function clamp(n: number, min: number, max: number) {
    return Math.max(Math.min(n, max), min);
}

export function removePrefix(str: string, prefix: string): string {
    while (str.startsWith(prefix)) {
        str = str.substring(prefix.length);
    }
    return str;
}
export function removeSuffix(str: string, prefix: string): string {
    while (str.startsWith(prefix)) {
        str = str.substring(0, str.length - prefix.length);
    }
    return str;
}
export function normalizeCodepoint(c: string | number): [number, string] {
    const cp = typeof c === "number" ? c : c.codePointAt(0);
    if (cp === undefined) {
        throw new TypeError("no char was found");
    }
    return [cp, String.fromCodePoint(cp)];
}

export function isAsciiDigit(c: string | number): boolean {
    const [cp] = normalizeCodepoint(c);
    return 0x30 <= cp && cp <= 0x39;
}
export function isAsciiLowercaseAlphabet(c: string | number): boolean {
    const [cp] = normalizeCodepoint(c);
    return 0x61 <= cp && cp <= 0x7a;
}
export function isAsciiUppercaseAlphabet(c: string | number): boolean {
    const [cp] = normalizeCodepoint(c);
    return 0x41 <= cp && cp <= 0x5a;
}
export function isAsciiAlphabet(c: string | number): boolean {
    return isAsciiLowercaseAlphabet(c) || isAsciiUppercaseAlphabet(c);
}
export function isAsciiLowercaseHexDigit(c: string | number): boolean {
    const [cp] = normalizeCodepoint(c);
    return 0x61 <= cp && cp <= 0x66;
}
export function isAsciiUppercaseHexDigit(c: string | number): boolean {
    const [cp] = normalizeCodepoint(c);
    return 0x41 <= cp && cp <= 0x46;
}
export function isAsciiHexDigit(c: string | number): boolean {
    return isAsciiLowercaseHexDigit(c) || isAsciiUppercaseHexDigit(c);
}
export function toAsciiLowercase(s: string) {
    let res = "";
    for (let c of s) {
        if (isAsciiUppercaseAlphabet(c)) {
            c = String.fromCodePoint(normalizeCodepoint(c)[0] - 0x41 + 0x61);
        }
        res += c;
    }
    return res;
}
export function toAsciiUppercase(s: string) {
    let res = "";
    for (let c of s) {
        if (isAsciiLowercaseAlphabet(c)) {
            c = String.fromCodePoint(normalizeCodepoint(c)[0] - 0x61 + 0x41);
        }
        res += c;
    }
    return res;
}

export class TextReader {
    str: string;
    cursor = 0;

    constructor(str: string) {
        this.str = str;
    }

    get isEof(): boolean {
        return this.str.length <= this.cursor;
    }
    nextChars(count: number): string {
        let res = "";
        let cur = this.cursor;
        for (let i = 0; i < count; i++) {
            const c = this.str.charAt(cur);
            cur += c.length;
            res += c;
        }
        return res;
    }
    startsWith(s: string, options: { asciiCaseIgnore?: boolean }): boolean {
        let res = this.str.substring(this.cursor, this.cursor + s.length);
        if (options.asciiCaseIgnore) {
            s = toAsciiLowercase(s);
            res = toAsciiLowercase(res);
        }
        return res === s;
    }

    consumeChars(count: number): string {
        let res = this.nextChars(count);
        this.cursor += res.length;
        return res;
    }
    consumeString(s: string, options: { asciiCaseIgnore?: boolean }) {
        if (!this.startsWith(s, options)) {
            throw new SyntaxError(`expected ${s} here`);
        }
        this.cursor += s.length;
    }
}

export class MessageBuilder {
    fmts: string[] = [];
    args: string[] = [];
    fgColor: string = "#eee";
    bgColor: string = "transparent";

    push(msg: string): this {
        let css = `background:${this.bgColor};color: ${this.fgColor}`;
        if (css === this.args[this.args.length - 1]) {
            this.fmts.push(`${msg}`);
        } else {
            this.fmts.push(`%c${msg}`);
            this.args.push(css);
        }
        return this;
    }
    build(): [string, string[]] {
        return [this.fmts.join(""), this.args];
    }
    log() {
        const [fmt, args] = this.build();
        console.log(fmt, ...args);
    }
}
