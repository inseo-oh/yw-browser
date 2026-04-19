// This file is part of YW. Copyright (c) 2026 Oh Inseo.
// SPDX-License-Identifier: BSD-3-Clause

import {
    getPropertyDescriptor,
    registerPropertyDescriptor,
    ShorthandPropertyDescriptor,
    ShorthandPropertyValue,
    SimplePropertyDescriptor,
    SimplePropertyValue,
} from "./properties.js";
import type { TokenStream } from "./syntax.js";
import {
    commaSeparatedRepeation,
    parseLengthOrPercentage,
    parseNumber,
    repeation,
    resolveLengthOrPercentage,
    serializeLengthOrPercentage,
    type Length,
    type Percentage,
} from "./values.js";

//==============================================================================
// CSS Fonts Module Level 3 - 3.1.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-family
    new SimplePropertyDescriptor({
        name: "font-family",
        valueParser: parseFontFamily,
        initial: (): FontFamily => ["sans-serif"],
        inherited: false,
        computed: (parent, value): FontFamily => value,
        serializer: (v): string =>
            v.map((v) => (0 <= v.indexOf('"') ? `'${v}'` : `"${v}"`)).join(","),
    }),
);

export function parseFontFamily(ts: TokenStream): FontFamily | undefined {
    return commaSeparatedRepeation(ts, 1, "unlimited", (ts) => {
        const oldCursor = ts.cursor;
        const str = ts.expectToken("string");
        if (str !== undefined) {
            return str.value;
        }
        const idents = repeation(
            ts,
            1,
            "unlimited",
            (ts) => ts.expectToken("ident")?.value,
        );
        if (idents !== undefined) {
            return idents.join(" ");
        }
        ts.cursor = oldCursor;
        return undefined;
    });
}

export type FontFamily = (FamilyName | GenericFamily)[];

// https://www.w3.org/TR/css-fonts-3/#family-name-value
export type FamilyName = string;

// https://www.w3.org/TR/css-fonts-3/#generic-family-value
export type GenericFamily =
    | "serif"
    | "sans-serif"
    | "cursive"
    | "fantasy"
    | "monospace";

//==============================================================================
// CSS Fonts Module Level 3 - 3.2.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-weight
    new SimplePropertyDescriptor({
        name: "font-weight",
        valueParser: parseFontWeight,
        initial: (): FontWeight => "normal",
        inherited: false,
        computed: (parent, value): FontWeight => {
            switch (value) {
                case "normal":
                    return 400;
                case "bold":
                    return 700;
                case "bolder":
                    switch (parent) {
                        case "normal":
                        case "bold":
                        case "bolder":
                        case "lighter":
                            throw new Error("bad inherited computed value");
                        default:
                            if (parent < 350) {
                                return 400;
                            } else if (parent < 550) {
                                return 700;
                            } else {
                                return 900;
                            }
                    }
                case "lighter":
                    switch (parent) {
                        case "normal":
                        case "bold":
                        case "bolder":
                        case "lighter":
                            throw new Error("bad inherited computed value");
                        default:
                            if (parent < 550) {
                                return 100;
                            } else if (parent < 750) {
                                return 400;
                            } else {
                                return 700;
                            }
                    }
                default:
                    return value;
            }
        },
        serializer: (v): string => `${v}`,
    }),
);

export function parseFontWeight(ts: TokenStream): FontWeight | undefined {
    const oldCursor = ts.cursor;
    if (ts.expectIdent("normal")) {
        return "normal";
    }
    if (ts.expectIdent("bold")) {
        return "bold";
    }
    if (ts.expectIdent("bolder")) {
        return "bolder";
    }
    if (ts.expectIdent("lighter")) {
        return "lighter";
    }
    const num = parseNumber(ts);
    if (num !== undefined) {
        if (num < 0 || 1000 < num) {
            ts.cursor = oldCursor;
            return undefined;
        }
        return num;
    }
    ts.cursor = oldCursor;
    return undefined;
}

export type FontWeight = "normal" | "bold" | "bolder" | "lighter" | number;

//==============================================================================
// CSS Fonts Module Level 3 - 3.4.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-style
    new SimplePropertyDescriptor({
        name: "font-style",
        valueParser: parseFontStyle,
        initial: (): FontStyle => "normal",
        inherited: false,
        computed: (parent, value): FontStyle => value,
        serializer: (v): string => v,
    }),
);

export type FontStyle = "normal" | "italic" | "oblique";

export function parseFontStyle(ts: TokenStream): FontStyle | undefined {
    if (ts.expectIdent("normal")) {
        return "normal";
    }
    if (ts.expectIdent("italic")) {
        return "italic";
    }
    if (ts.expectIdent("oblique")) {
        return "oblique";
    }
    return undefined;
}

//==============================================================================
// CSS Fonts Module Level 3 - 3.5.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-size
    new SimplePropertyDescriptor({
        name: "font-size",
        valueParser: parseFontSize,
        initial: (): FontSize => "medium",
        inherited: true,
        computed: (parent, value): number => {
            switch (value) {
                case "xx-small":
                case "x-small":
                case "small":
                case "medium":
                case "large":
                case "x-large":
                case "xx-large":
                    return ABSOLUTE_SIZES[value];
                case "larger":
                    return ABSOLUTE_SIZES[larger(absoluteFromPx(parent))];
                case "smaller":
                    return ABSOLUTE_SIZES[smaller(absoluteFromPx(parent))];
                default:
                    return resolveLengthOrPercentage(value, parent, parent);
            }
        },
        serializer: (v): string =>
            typeof v === "string" ? v : serializeLengthOrPercentage(v),
    }),
);

export type FontSize = AbsoluteSize | RelativeSize | Length | Percentage;

export function parseFontSize(ts: TokenStream): FontSize | undefined {
    return (
        parseAbsoluteSize(ts) ??
        parseRelativeSize(ts) ??
        parseLengthOrPercentage(ts, { minValue: 0 })
    );
}

const PREFERRED_FONT_SIZE = 32;

const ABSOLUTE_SIZES = {
    "xx-small": (PREFERRED_FONT_SIZE * 3) / 5,
    "x-small": (PREFERRED_FONT_SIZE * 3) / 4,
    small: (PREFERRED_FONT_SIZE * 8) / 9,
    medium: PREFERRED_FONT_SIZE,
    large: (PREFERRED_FONT_SIZE * 6) / 5,
    "x-large": (PREFERRED_FONT_SIZE * 3) / 2,
    "xx-large": (PREFERRED_FONT_SIZE * 2) / 1,
} as const;

// https://www.w3.org/TR/css-fonts-3/#absolute-size-value
export type AbsoluteSize = keyof typeof ABSOLUTE_SIZES;

function parseAbsoluteSize(ts: TokenStream): AbsoluteSize | undefined {
    if (ts.expectIdent("xx-small")) {
        return "xx-small";
    }
    if (ts.expectIdent("x-small")) {
        return "x-small";
    }
    if (ts.expectIdent("small")) {
        return "small";
    }
    if (ts.expectIdent("medium")) {
        return "medium";
    }
    if (ts.expectIdent("large")) {
        return "large";
    }
    if (ts.expectIdent("x-large")) {
        return "x-large";
    }
    if (ts.expectIdent("xx-large")) {
        return "xx-large";
    }
    return undefined;
}

function absoluteFromPx(inSizePx: number): AbsoluteSize {
    let minDiff: number | undefined = undefined;
    let resSize: AbsoluteSize;
    for (const key in ABSOLUTE_SIZES) {
        const absSize = key as AbsoluteSize;
        const absSizePx = ABSOLUTE_SIZES[absSize];
        const diff = Math.abs(absSizePx - inSizePx);
        if (minDiff === undefined || diff < minDiff) {
            resSize = absSize;
            minDiff = diff;
        }
    }
    return resSize!;
}
function smaller(size: AbsoluteSize): AbsoluteSize {
    switch (size) {
        case "xx-small":
        case "x-small":
            return "xx-small";
        case "small":
            return "x-small";
        case "medium":
            return "small";
        case "large":
            return "medium";
        case "x-large":
            return "large";
        case "xx-large":
            return "x-large";
    }
}
function larger(size: AbsoluteSize): AbsoluteSize {
    switch (size) {
        case "xx-small":
            return "x-small";
        case "x-small":
            return "small";
        case "small":
            return "medium";
        case "medium":
            return "large";
        case "large":
            return "x-large";
        case "x-large":
        case "xx-large":
            return "x-large";
    }
}

// https://www.w3.org/TR/css-fonts-3/#relative-size-value
export type RelativeSize = "larger" | "smaller";

function parseRelativeSize(ts: TokenStream): RelativeSize | undefined {
    if (ts.expectIdent("larger")) {
        return "larger";
    }
    if (ts.expectIdent("smaller")) {
        return "smaller";
    }
    return undefined;
}

//==============================================================================
// CSS Fonts Module Level 3 - 6.6.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-variant-caps
    new SimplePropertyDescriptor({
        name: "font-variant-caps",
        valueParser: parseFontVariantCaps,
        initial: (): FontVariantCaps => "normal",
        inherited: true,
        computed: (parent, value): FontVariantCaps => value,
        serializer: (v): string => v,
    }),
);

export type FontVariantCaps = "normal" | "small-caps";

function parseFontVariantCaps(ts: TokenStream): FontVariantCaps | undefined {
    if (ts.expectIdent("normal")) {
        return "normal";
    }
    if (ts.expectIdent("small-caps")) {
        return "small-caps";
    }
    // TODO: all-small-caps | petite-caps | all-petite-caps | unicase | titling-caps from Level 3
    return undefined;
}

//==============================================================================
// CSS Fonts Module Level 3 - 6.9.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font-variant
    new (class extends ShorthandPropertyDescriptor {
        constructor() {
            super({
                name: "font-variant",
                propertyNames: [
                    "font-variant-caps",
                    // TODO: Support other shorthands from Level 3, once we have properties for them
                ],
                hiddenPropertyNames: [],
                inherited: true,
            });
        }

        parse(ts: TokenStream): ShorthandPropertyValue | undefined {
            let fontVariantCaps: FontVariantCaps | undefined;
            if (ts.expectIdent("normal")) {
                // Use initial value as-is
                fontVariantCaps = "normal";
            } else {
                while (fontVariantCaps === undefined) {
                    ts.skipWhitespaces();
                    if (fontVariantCaps === undefined) {
                        fontVariantCaps = parseFontVariantCaps(ts);
                        if (fontVariantCaps !== undefined) {
                            continue;
                        }
                    }
                    // TODO: Support other shorthands from Level 3, once we have properties for them
                }
            }
            if (fontVariantCaps !== undefined) {
                fontVariantCaps =
                    fontVariantCaps ??
                    new SimplePropertyValue("font-variant-caps", "normal");
                // TODO: Support other shorthands from Level 3, once we have properties for them
                return new ShorthandPropertyValue(this.name, [
                    new SimplePropertyValue(
                        "font-variant-caps",
                        fontVariantCaps,
                    ),
                ]);
            }
            return undefined;
        }

        serializeValue(v: ShorthandPropertyValue): string {
            return `${v.values.map((v) => v.descriptor.serializeValue(v)).join(" ")}`;
        }
    })(),
);

//==============================================================================
// CSS Fonts Module Level 3 - 3.7.
//==============================================================================

registerPropertyDescriptor(
    // https://www.w3.org/TR/css-fonts-3/#propdef-font
    new (class extends ShorthandPropertyDescriptor {
        constructor() {
            super({
                name: "font",
                propertyNames: [
                    "font-style",
                    "font-variant",
                    "font-weight",
                    "font-size",
                    // "line-height", // TODO
                    "font-family",
                    // TODO: Support other shorthands from Level 3, once we have properties for them
                ],
                hiddenPropertyNames: [],
                inherited: true,
            });
        }

        parse(ts: TokenStream): ShorthandPropertyValue | undefined {
            const oldCursor = ts.cursor;
            let fontStyle: FontStyle | undefined;
            let fontVariant: FontVariantCaps | undefined;
            let fontWeight: FontWeight | undefined;
            let fontSize: FontSize | undefined;
            // let lineHeight; // TODO
            let fontFamily: FontFamily | undefined;
            if (
                ts.expectIdent("caption") ||
                ts.expectIdent("icon") ||
                ts.expectIdent("menu") ||
                ts.expectIdent("message-box") ||
                ts.expectIdent("small-caption") ||
                ts.expectIdent("status-bar")
            ) {
                // STUB
                fontStyle = "normal";
                fontVariant = "normal";
                fontWeight = "normal";
                fontSize = { value: PREFERRED_FONT_SIZE, unit: "px" };
                fontFamily = ["sans-serif"];
            } else {
                while (
                    fontStyle === undefined ||
                    fontVariant === undefined ||
                    fontWeight === undefined
                ) {
                    ts.skipWhitespaces();
                    if (fontStyle === undefined) {
                        fontStyle = parseFontStyle(ts);
                        if (fontStyle !== undefined) {
                            continue;
                        }
                    }
                    if (fontVariant === undefined) {
                        fontVariant = parseFontVariantCSS21(ts);
                        if (fontVariant !== undefined) {
                            continue;
                        }
                    }
                    if (fontWeight === undefined) {
                        fontWeight = parseFontWeight(ts);
                        if (fontWeight !== undefined) {
                            continue;
                        }
                    }
                    // TODO: Support other shorthands from Level 3, once we have properties for them
                    break;
                }
                fontSize = parseFontSize(ts);
                if (fontSize !== undefined) {
                    ts.skipWhitespaces();
                    if (ts.expectDelim("/")) {
                        // TODO: <font-size>/<line-height>
                        throw new Error("Not implemented yet");
                    }
                }
                fontFamily = parseFontFamily(ts);
                if (fontFamily === undefined) {
                    ts.cursor = oldCursor;
                    return undefined;
                }
            }

            return new ShorthandPropertyValue(this.name, [
                fontStyle !== undefined
                    ? new SimplePropertyValue("font-style", fontStyle)
                    : getPropertyDescriptor("font-style").initialValue(),
                fontVariant !== undefined
                    ? new SimplePropertyValue("font-variant", fontVariant)
                    : getPropertyDescriptor("font-variant").initialValue(),
                fontWeight !== undefined
                    ? new SimplePropertyValue("font-weight", fontWeight)
                    : getPropertyDescriptor("font-weight").initialValue(),
                fontSize !== undefined
                    ? new SimplePropertyValue("font-size", fontSize)
                    : getPropertyDescriptor("font-size").initialValue(),
                fontFamily !== undefined
                    ? new SimplePropertyValue("font-family", fontFamily)
                    : getPropertyDescriptor("font-family").initialValue(),
            ]);
        }

        serializeValue(v: ShorthandPropertyValue): string {
            return `${v.values.map((v) => v.descriptor.serializeValue(v)).join(" ")}`;
        }
    })(),
);

// https://www.w3.org/TR/css-fonts-3/#font-variant-css21-values
export type FontVariantCSS21 = "normal" | "small-caps";

function parseFontVariantCSS21(ts: TokenStream): FontVariantCaps | undefined {
    if (ts.expectIdent("normal")) {
        return "normal";
    }
    if (ts.expectIdent("small-caps")) {
        return "small-caps";
    }
    return undefined;
}
