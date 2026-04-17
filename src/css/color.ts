// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import { toASCIILowercase } from "../infra.js";
import { clamp } from "../utility.js";
import {
    registerPropertyDescriptor,
    SimplePropertyDescriptor,
} from "./properties.js";
import { parse, TokenStream, type ASTFunction, type Token } from "./syntax.js";
import {
    commaSeparatedRepeation,
    parseNumber,
    parsePercentage,
} from "./values.js";

//==============================================================================
// CSS Color Module Level 4 - 3.2.
//==============================================================================
registerPropertyDescriptor(
    // https://www.w3.org/TR/css-color-4/#propdef-color
    new SimplePropertyDescriptor({
        name: "color",
        valueParser: parseColor,
        initial: (): Color => ({ kind: "system", name: "CanvasText" }),
        inherited: false,
        computed: (parent, value): Color => resolveColor(value),
        serializer: serializeColor,
    }),
);

//==============================================================================
// CSS Color Module Level 4 - 4.
//==============================================================================

export type Color =
    | RGBColor
    | HexColor
    | NamedColor
    | SystemColor
    | CurrentColor;

export function parseColor(ts: TokenStream): Color | undefined {
    const oldCursor = ts.cursor;

    const hashToken = ts.expectToken("hash");
    if (hashToken != undefined) {
        return parseHexNotation(hashToken);
    }
    const func = ts.expectFunction("rgb");
    if (func != undefined) {
        // TODO: Support Level 4's rgba() alias
        return parseRGBFunction(func);
    }
    if (ts.expectIdent("currentColor")) {
        return { kind: "currentColor" };
    }

    const ident = ts.expectToken("ident");
    if (ident !== undefined) {
        let key = Object.keys(NAMED_COLORS).find(
            (x) => toASCIILowercase(x) === toASCIILowercase(ident.value),
        );
        if (key !== undefined) {
            return { kind: "named", name: key as NamedColor["name"] };
        }
        key = Object.keys(SYSTEM_COLORS).find(
            (x) => toASCIILowercase(x) === toASCIILowercase(ident.value),
        );
        if (key !== undefined) {
            return { kind: "system", name: key as SystemColor["name"] };
        }
    }

    ts.cursor = oldCursor;
    return undefined;
}

function colorLiteral(s: string): Color {
    const c = parse(s, parseColor);
    if (c === undefined) {
        throw new Error(`could not parse color literal ${s}`);
    }
    return c;
}

//==============================================================================
// CSS Color Module Level 4 - 5.
//==============================================================================

export type RGBColor = {
    kind: "rgb";
    r: number;
    g: number;
    b: number;
};

//==============================================================================
// CSS Color Module Level 4 - 5.1.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#typedef-legacy-rgb-syntax
function parseLegacyRGBSyntax(func: ASTFunction): RGBColor | undefined {
    let r, g, b;

    // TODO: Support Level 4's alpha syntax

    const ts = new TokenStream(func.value);
    // rgb(< >r , g , b ) --------------------------------------------
    ts.skipWhitespaces();
    // rgb( <r , g , b> ) --------------------------------------------
    const per = commaSeparatedRepeation(ts, 1, 3, () => {
        return parsePercentage(ts);
    });
    if (per?.length == 3) {
        // Percentage value
        const rPer = clamp(per[0]!.value, 0, 100);
        const gPer = clamp(per[1]!.value, 0, 100);
        const bBer = clamp(per[2]!.value, 0, 100);
        r = Math.floor((rPer / 100) * 255);
        g = Math.floor((gPer / 100) * 255);
        b = Math.floor((bBer / 100) * 255);
    } else if (per === undefined) {
        const num = commaSeparatedRepeation(ts, 1, 3, () => {
            return parseNumber(ts);
        });
        if (num?.length != 3) {
            return undefined;
        }
        r = clamp(num[0]!, 0, 255);
        g = clamp(num[1]!, 0, 255);
        b = clamp(num[2]!, 0, 255);
    } else {
        return undefined;
    }
    // rgb( r , g , b< >) --------------------------------------------
    ts.skipWhitespaces();
    if (!ts.isEnd()) {
        return undefined;
    }
    return { kind: "rgb", r, g, b };
}

// https://www.w3.org/TR/css-color-4/#funcdef-rgb
function parseRGBFunction(func: ASTFunction): RGBColor | undefined {
    // TODO: Support Level 4's modern rgb() syntax

    return parseLegacyRGBSyntax(func);
}

//==============================================================================
// CSS Color Module Level 4 - 5.2.
//==============================================================================

export type HexColor = {
    kind: "hex";
    hex: string;
    rgb: RGBColor;
};

// https://www.w3.org/TR/css-color-4/#hex-notation
function parseHexNotation(
    hashToken: Extract<Token, { kind: "hash" }>,
): HexColor | undefined {
    const hashValue = hashToken.value;
    let rStr, gStr, bStr;
    switch (hashValue.length) {
        case 3:
            // #rgb
            rStr = hashValue.charAt(0);
            rStr += rStr;
            gStr = hashValue.charAt(1);
            gStr += gStr;
            bStr = hashValue.charAt(2);
            bStr += bStr;
            break;
        case 6:
            // #rrggbb
            rStr = hashValue.substring(0, 2);
            gStr = hashValue.substring(2, 4);
            bStr = hashValue.substring(4, 6);
            break;
        // TODO: Support Level 4's #rgba and #rrggbbaa syntax
        default:
            return undefined;
    }
    const r = parseInt(rStr, 16);
    const g = parseInt(gStr, 16);
    const b = parseInt(bStr, 16);
    return { kind: "hex", hex: hashValue, rgb: { kind: "rgb", r, g, b } };
}

//==============================================================================
// CSS Color Module Level 4 - 6.1.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#typedef-named-color
export const NAMED_COLORS = {
    maroon: colorLiteral("#800000"),
    red: colorLiteral("#ff0000"),
    orange: colorLiteral("#ffA500"),
    yellow: colorLiteral("#ffff00"),
    olive: colorLiteral("#808000"),
    purple: colorLiteral("#800080"),
    fuchsia: colorLiteral("#ff00ff"),
    white: colorLiteral("#ffffff"),
    lime: colorLiteral("#00ff00"),
    green: colorLiteral("#008000"),
    navy: colorLiteral("#000080"),
    blue: colorLiteral("#0000ff"),
    aqua: colorLiteral("#00ffff"),
    teal: colorLiteral("#008080"),
} as const;
export type NamedColor = {
    kind: "named";
    name: keyof typeof NAMED_COLORS;
};

//==============================================================================
// CSS Color Module Level 4 - 6.2.
// CSS Color Module Level 4 - Appendix.A.
//==============================================================================

// TODO: These colors were copied from a modern browser,
//       and some of them doesn't appear to be right color :(

export const SYSTEM_COLORS = {
    // https://www.w3.org/TR/css-color-4/#typedef-system-color
    ButtonFace: colorLiteral("#f0f0f0"),
    ButtonText: colorLiteral("#000000"),
    GrayText: colorLiteral("#6d6d6d"),
    Highlight: colorLiteral("#0078d7"),
    HighlightText: colorLiteral("#ffffff"),
    // TODO: Add newer system colors from Level 4 (other than CanvasText)
    CanvasText: colorLiteral("#000000"),

    // https://www.w3.org/TR/css-color-4/#typedef-deprecated-color
    ActiveBorder: colorLiteral("#000000"),
    ActiveCaption: colorLiteral("#ffffff"),
    AppWorkspace: colorLiteral("#ffffff"),
    Background: colorLiteral("#ffffff"),
    ButtonHighlight: colorLiteral("#f0f0f0"),
    ButtonShadow: colorLiteral("#f0f0f0"),
    CaptionText: colorLiteral("#000000"),
    InactiveBorder: colorLiteral("#000000"),
    InactiveCaption: colorLiteral("#ffffff"),
    InactiveCaptionText: colorLiteral("#808080"),
    InfoBackground: colorLiteral("#ffffff"),
    InfoText: colorLiteral("#000000"),
    Menu: colorLiteral("#ffffff"),
    MenuText: colorLiteral("#000000"),
    Scrollbar: colorLiteral("#ffffff"),
    ThreeDDarkShadow: colorLiteral("#000000"),
    ThreeDFace: colorLiteral("#f0f0f0"),
    ThreeDHighlight: colorLiteral("#000000"),
    ThreeDLightShadow: colorLiteral("#000000"),
    ThreeDShadow: colorLiteral("#000000"),
    Window: colorLiteral("#ffffff"),
    WindowFrame: colorLiteral("#000000"),
    WindowText: colorLiteral("#000000"),
} as const;
export type SystemColor = {
    kind: "system";
    name: keyof typeof SYSTEM_COLORS;
};

//==============================================================================
// CSS Color Module Level 4 - 6.4.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#currentcolor-color
export type CurrentColor = { kind: "currentColor" };

//==============================================================================
// CSS Color Module Level 4 - 15.
//==============================================================================

export function resolveColor(color: Color): RGBColor | CurrentColor {
    switch (color.kind) {
        case "hex":
        case "rgb":
        case "named":
        case "system":
            return resolveSRGBValues(color);
        case "currentColor":
            return resolveOtherColors(color);
    }
}

//==============================================================================
// CSS Color Module Level 4 - 15.1.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#resolving-sRGB-values
function resolveSRGBValues(
    color: HexColor | RGBColor | NamedColor | SystemColor,
): RGBColor {
    let res;
    switch (color.kind) {
        case "hex":
            return color.rgb;
        case "rgb":
            return color;
        case "named":
            res = resolveColor(NAMED_COLORS[color.name]);
            if (res.kind === "currentColor") {
                throw new Error("result should not be currentColor");
            }
            return res;
        case "system":
            res = resolveColor(SYSTEM_COLORS[color.name]);
            if (res.kind === "currentColor") {
                throw new Error("result should not be currentColor");
            }
            return res;
    }
}

//==============================================================================
// CSS Color Module Level 4 - 15.5.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#resolving-other-colors
function resolveOtherColors(
    color: SystemColor | CurrentColor,
): RGBColor | CurrentColor {
    switch (color.kind) {
        case "system":
            return resolveColor(SYSTEM_COLORS[color.name]);
        case "currentColor":
            return color;
    }
}

//==============================================================================
// CSS Color Module Level 4 - 16.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#serializing-color-values

export function serializeColor(color: Color): string {
    switch (color.kind) {
        case "hex":
        case "rgb":
        case "named":
        case "system":
            return serializeSRGBValues(color);
        case "currentColor":
            return serializeOtherColors(color);
    }
}

//==============================================================================
// CSS Color Module Level 4 - 16.2.
//==============================================================================

export function serializeSRGBValues(
    color: HexColor | RGBColor | NamedColor | SystemColor,
): string {
    const rgb = resolveSRGBValues(color);
    return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

//==============================================================================
// CSS Color Module Level 4 - 16.6.
//==============================================================================

// https://www.w3.org/TR/css-color-4/#serializing-other-colors
function serializeOtherColors(color: CurrentColor): string {
    switch (color.kind) {
        case "currentColor":
            return "currentcolor";
    }
}
