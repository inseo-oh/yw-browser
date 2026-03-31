// This file is part of YW. Copyright (codePoint) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    toASCIILowercaseCodePoint,
    toASCIIUppercaseCodePoint,
} from "./utility.js";

//==========================================================================
// Infra Standard - 4.6.
//==========================================================================

// https://infra.spec.whatwg.org/#leading-surrogate
export function isLeadingSurrogate(codePoint: number) {
    return 0xd800 <= codePoint && codePoint <= 0xdbff;
}

// https://infra.spec.whatwg.org/#trailing-surrogate
export function isTrailingSurrogate(codePoint: number) {
    return 0xdc00 <= codePoint && codePoint <= 0xdfff;
}

// https://infra.spec.whatwg.org/#surrogate
export function isSurrogate(codePoint: number) {
    return isLeadingSurrogate(codePoint) || isTrailingSurrogate(codePoint);
}

// https://infra.spec.whatwg.org/#scalar-value
export function is_scalar(codePoint: number) {
    return !isSurrogate(codePoint);
}

// https://infra.spec.whatwg.org/#noncharacter
export function isNoncharacter(codePoint: number) {
    switch (codePoint) {
        case 0xfffe:
        case 0xffff:
        case 0x1fffe:
        case 0x1ffff:
        case 0x2fffe:
        case 0x2ffff:
        case 0x3fffe:
        case 0x3ffff:
        case 0x4fffe:
        case 0x4ffff:
        case 0x5fffe:
        case 0x5ffff:
        case 0x6fffe:
        case 0x6ffff:
        case 0x7fffe:
        case 0x7ffff:
        case 0x8fffe:
        case 0x8ffff:
        case 0x9fffe:
        case 0x9ffff:
        case 0xafffe:
        case 0xaffff:
        case 0xbfffe:
        case 0xbffff:
        case 0xcfffe:
        case 0xcffff:
        case 0xdfffe:
        case 0xdffff:
        case 0xefffe:
        case 0xeffff:
        case 0xffffe:
        case 0xfffff:
        case 0x10fffe:
        case 0x10ffff:
            return true;
    }
    return false;
}

// https://infra.spec.whatwg.org/#ascii-code-point
export function isASCIICodePoint(codePoint: number) {
    return 0x0000 <= codePoint && codePoint <= 0x007f;
}

// https://infra.spec.whatwg.org/#ascii-tab-or-newline
export function isASCIITabOrNewline(codePoint: number) {
    switch (codePoint) {
        case 0x0009:
        case 0x000a:
        case 0x000d:
            return true;
    }
    return false;
}

// https://infra.spec.whatwg.org/#ascii-whitespace
export function isASCIIWhitespace(codePoint: number) {
    switch (codePoint) {
        case 0x0009:
        case 0x000a:
        case 0x000c:
        case 0x000d:
        case 0x0020:
            return true;
    }
    return false;
}

// https://infra.spec.whatwg.org/#c0-control
export function isC0Control(codePoint: number) {
    return 0x0000 <= codePoint && codePoint <= 0x001f;
}

// https://infra.spec.whatwg.org/#c0-control-or-space
export function isC0ControlOrSpace(codePoint: number) {
    return isC0Control(codePoint) || codePoint === 0x0020;
}

// https://infra.spec.whatwg.org/#control
export function is_control(codePoint: number) {
    return (
        isC0Control(codePoint) || (0x007f <= codePoint && codePoint <= 0x009f)
    );
}

// https://infra.spec.whatwg.org/#ascii-digit
export function isASCIIDigit(codePoint: number) {
    return 0x0030 <= codePoint && codePoint <= 0x0039;
}

// https://infra.spec.whatwg.org/#ascii-upper-hex-digit
export function isASCIIUpperHexDigit(codePoint: number) {
    return 0x0041 <= codePoint && codePoint <= 0x0046;
}

// https://infra.spec.whatwg.org/#ascii-lower-hex-digit
export function isASCIILowerHexDigit(codePoint: number) {
    return 0x0061 <= codePoint && codePoint <= 0x0066;
}

// https://infra.spec.whatwg.org/#ascii-hex-digit
export function is_ascii_hex_digit(codePoint: number) {
    return isASCIIUpperHexDigit(codePoint) || isASCIILowerHexDigit(codePoint);
}

// https://infra.spec.whatwg.org/#ascii-upper-alpha
export function isASCIIUpperAlpha(codePoint: number) {
    return 0x0041 <= codePoint && codePoint <= 0x005a;
}

// https://infra.spec.whatwg.org/#ascii-lower-alpha
export function isASCIILowerAlpha(codePoint: number) {
    return 0x0061 <= codePoint && codePoint <= 0x007a;
}

// https://infra.spec.whatwg.org/#ascii-alpha
export function isASCIIAlpha(codePoint: number) {
    return isASCIIUpperAlpha(codePoint) || isASCIILowerAlpha(codePoint);
}

//==========================================================================
// Infra Standard - 4.7.
//==========================================================================

// https://infra.spec.whatwg.org/#ascii-lowercase
export function toASCIILowercase(s: string) {
    let result = "";
    for (const c of s) {
        result += String.fromCodePoint(
            toASCIILowercaseCodePoint(c.codePointAt(0)!),
        );
    }
    return result;
}

// https://infra.spec.whatwg.org/#ascii-uppercase
export function toASCIIUppercase(s: string) {
    let result = "";
    for (const c of s) {
        result += String.fromCodePoint(
            toASCIIUppercaseCodePoint(c.codePointAt(0)!),
        );
    }
    return result;
}

// https://infra.spec.whatwg.org/#ascii-case-insensitive
export function isASCIICaseInsensitiveMatch(a: string, b: string) {
    return toASCIILowercase(a) === toASCIILowercase(b);
}

//==========================================================================
// Infra Standard - 8.
//==========================================================================

// https://infra.spec.whatwg.org/#html-namespace
export const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

// https://infra.spec.whatwg.org/#mathml-namespace
export const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";

// https://infra.spec.whatwg.org/#svg-namespace
export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// https://infra.spec.whatwg.org/#xlink-namespace
export const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

// https://infra.spec.whatwg.org/#xml-namespace
export const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";

// https://infra.spec.whatwg.org/#xmlns-namespace
export const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
