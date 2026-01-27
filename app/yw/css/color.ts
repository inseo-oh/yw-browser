import { clamp, toAsciiLowercase } from "../utility";
import { CSSSyntaxError, TokenStream } from "./syntax";
import { parseNumber, parsePercentage } from "./value";

const rgba = (r: number, g: number, b: number, a: number): Color => {
    return { type: "rgb", r, g, b, a };
};

// https://www.w3.org/TR/css-color-4/#named-colors
export const namedColors = new Map([
    ["aliceblue", rgba(240, 248, 255, 255)],
    ["antiquewhite", rgba(250, 235, 215, 255)],
    ["aqua", rgba(0, 255, 255, 255)],
    ["aquamarine", rgba(127, 255, 212, 255)],
    ["azure", rgba(240, 255, 255, 255)],
    ["beige", rgba(245, 245, 220, 255)],
    ["bisque", rgba(255, 228, 196, 255)],
    ["black", rgba(0, 0, 0, 255)],
    ["blanchedalmond", rgba(255, 235, 205, 255)],
    ["blue", rgba(0, 0, 255, 255)],
    ["blueviolet", rgba(138, 43, 226, 255)],
    ["brown", rgba(165, 42, 42, 255)],
    ["burlywood", rgba(222, 184, 135, 255)],
    ["cadetblue", rgba(95, 158, 160, 255)],
    ["chartreuse", rgba(127, 255, 0, 255)],
    ["chocolate", rgba(210, 105, 30, 255)],
    ["coral", rgba(255, 127, 80, 255)],
    ["cornflowerblue", rgba(100, 149, 237, 255)],
    ["cornsilk", rgba(255, 248, 220, 255)],
    ["crimson", rgba(220, 20, 60, 255)],
    ["cyan", rgba(0, 255, 255, 255)],
    ["darkblue", rgba(0, 0, 139, 255)],
    ["darkcyan", rgba(0, 139, 139, 255)],
    ["darkgoldenrod", rgba(184, 134, 11, 255)],
    ["darkgray", rgba(169, 169, 169, 255)],
    ["darkgreen", rgba(0, 100, 0, 255)],
    ["darkgrey", rgba(169, 169, 169, 255)],
    ["darkkhaki", rgba(189, 183, 107, 255)],
    ["darkmagenta", rgba(139, 0, 139, 255)],
    ["darkolivegreen", rgba(85, 107, 47, 255)],
    ["darkorange", rgba(255, 140, 0, 255)],
    ["darkorchid", rgba(153, 50, 204, 255)],
    ["darkred", rgba(139, 0, 0, 255)],
    ["darksalmon", rgba(233, 150, 122, 255)],
    ["darkseagreen", rgba(143, 188, 143, 255)],
    ["darkslateblue", rgba(72, 61, 139, 255)],
    ["darkslategray", rgba(47, 79, 79, 255)],
    ["darkslategrey", rgba(47, 79, 79, 255)],
    ["darkturquoise", rgba(0, 206, 209, 255)],
    ["darkviolet", rgba(148, 0, 211, 255)],
    ["deeppink", rgba(255, 20, 147, 255)],
    ["deepskyblue", rgba(0, 191, 255, 255)],
    ["dimgray", rgba(105, 105, 105, 255)],
    ["dimgrey", rgba(105, 105, 105, 255)],
    ["dodgerblue", rgba(30, 144, 255, 255)],
    ["firebrick", rgba(178, 34, 34, 255)],
    ["floralwhite", rgba(255, 250, 240, 255)],
    ["forestgreen", rgba(34, 139, 34, 255)],
    ["fuchsia", rgba(255, 0, 255, 255)],
    ["gainsboro", rgba(220, 220, 220, 255)],
    ["ghostwhite", rgba(248, 248, 255, 255)],
    ["gold", rgba(255, 215, 0, 255)],
    ["goldenrod", rgba(218, 165, 32, 255)],
    ["gray", rgba(128, 128, 128, 255)],
    ["green", rgba(0, 128, 0, 255)],
    ["greenyellow", rgba(173, 255, 47, 255)],
    ["grey", rgba(128, 128, 128, 255)],
    ["honeydew", rgba(240, 255, 240, 255)],
    ["hotpink", rgba(255, 105, 180, 255)],
    ["indianred", rgba(205, 92, 92, 255)],
    ["indigo", rgba(75, 0, 130, 255)],
    ["ivory", rgba(255, 255, 240, 255)],
    ["khaki", rgba(240, 230, 140, 255)],
    ["lavender", rgba(230, 230, 250, 255)],
    ["lavenderblush", rgba(255, 240, 245, 255)],
    ["lawngreen", rgba(124, 252, 0, 255)],
    ["lemonchiffon", rgba(255, 250, 205, 255)],
    ["lightblue", rgba(173, 216, 230, 255)],
    ["lightcoral", rgba(240, 128, 128, 255)],
    ["lightcyan", rgba(224, 255, 255, 255)],
    ["lightgoldenrodyellow", rgba(250, 250, 210, 255)],
    ["lightgray", rgba(211, 211, 211, 255)],
    ["lightgreen", rgba(144, 238, 144, 255)],
    ["lightgrey", rgba(211, 211, 211, 255)],
    ["lightpink", rgba(255, 182, 193, 255)],
    ["lightsalmon", rgba(255, 160, 122, 255)],
    ["lightseagreen", rgba(32, 178, 170, 255)],
    ["lightskyblue", rgba(135, 206, 250, 255)],
    ["lightslategray", rgba(119, 136, 153, 255)],
    ["lightslategrey", rgba(119, 136, 153, 255)],
    ["lightsteelblue", rgba(176, 196, 222, 255)],
    ["lightyellow", rgba(255, 255, 224, 255)],
    ["lime", rgba(0, 255, 0, 255)],
    ["limegreen", rgba(50, 205, 50, 255)],
    ["linen", rgba(250, 240, 230, 255)],
    ["magenta", rgba(255, 0, 255, 255)],
    ["maroon", rgba(128, 0, 0, 255)],
    ["mediumaquamarine", rgba(102, 205, 170, 255)],
    ["mediumblue", rgba(0, 0, 205, 255)],
    ["mediumorchid", rgba(186, 85, 211, 255)],
    ["mediumpurple", rgba(147, 112, 219, 255)],
    ["mediumseagreen", rgba(60, 179, 113, 255)],
    ["mediumslateblue", rgba(123, 104, 238, 255)],
    ["mediumspringgreen", rgba(0, 250, 154, 255)],
    ["mediumturquoise", rgba(72, 209, 204, 255)],
    ["mediumvioletred", rgba(199, 21, 133, 255)],
    ["midnightblue", rgba(25, 25, 112, 255)],
    ["mintcream", rgba(245, 255, 250, 255)],
    ["mistyrose", rgba(255, 228, 225, 255)],
    ["moccasin", rgba(255, 228, 181, 255)],
    ["navajowhite", rgba(255, 222, 173, 255)],
    ["navy", rgba(0, 0, 128, 255)],
    ["oldlace", rgba(253, 245, 230, 255)],
    ["olive", rgba(128, 128, 0, 255)],
    ["olivedrab", rgba(107, 142, 35, 255)],
    ["orange", rgba(255, 165, 0, 255)],
    ["orangered", rgba(255, 69, 0, 255)],
    ["orchid", rgba(218, 112, 214, 255)],
    ["palegoldenrod", rgba(238, 232, 170, 255)],
    ["palegreen", rgba(152, 251, 152, 255)],
    ["paleturquoise", rgba(175, 238, 238, 255)],
    ["palevioletred", rgba(219, 112, 147, 255)],
    ["papayawhip", rgba(255, 239, 213, 255)],
    ["peachpuff", rgba(255, 218, 185, 255)],
    ["peru", rgba(205, 133, 63, 255)],
    ["pink", rgba(255, 192, 203, 255)],
    ["plum", rgba(221, 160, 221, 255)],
    ["powderblue", rgba(176, 224, 230, 255)],
    ["purple", rgba(128, 0, 128, 255)],
    ["rebeccapurple", rgba(102, 51, 153, 255)],
    ["red", rgba(255, 0, 0, 255)],
    ["rosybrown", rgba(188, 143, 143, 255)],
    ["royalblue", rgba(65, 105, 225, 255)],
    ["saddlebrown", rgba(139, 69, 19, 255)],
    ["salmon", rgba(250, 128, 114, 255)],
    ["sandybrown", rgba(244, 164, 96, 255)],
    ["seagreen", rgba(46, 139, 87, 255)],
    ["seashell", rgba(255, 245, 238, 255)],
    ["sienna", rgba(160, 82, 45, 255)],
    ["silver", rgba(192, 192, 192, 255)],
    ["skyblue", rgba(135, 206, 235, 255)],
    ["slateblue", rgba(106, 90, 205, 255)],
    ["slategray", rgba(112, 128, 144, 255)],
    ["slategrey", rgba(112, 128, 144, 255)],
    ["snow", rgba(255, 250, 250, 255)],
    ["springgreen", rgba(0, 255, 127, 255)],
    ["steelblue", rgba(70, 130, 180, 255)],
    ["tan", rgba(210, 180, 140, 255)],
    ["teal", rgba(0, 128, 128, 255)],
    ["thistle", rgba(216, 191, 216, 255)],
    ["tomato", rgba(255, 99, 71, 255)],
    ["turquoise", rgba(64, 224, 208, 255)],
    ["violet", rgba(238, 130, 238, 255)],
    ["wheat", rgba(245, 222, 179, 255)],
    ["white", rgba(255, 255, 255, 255)],
    ["whitesmoke", rgba(245, 245, 245, 255)],
    ["yellow", rgba(255, 255, 0, 255)],
    ["yellowgreen", rgba(154, 205, 50, 255)],
]);

export type Color =
    | { type: "rgb"; r: number; g: number; b: number; a: number }
    | { type: "currentColor" }
    | { type: "hsl" } // TODO
    | { type: "hwb" } // TODO
    | { type: "lab" } // TODO
    | { type: "lch" } // TODO
    | { type: "oklab" } // TODO
    | { type: "oklch" } // TODO
    | { type: "colorfn" }; // TODO

export function colorToRgb(
    c: Color,
    currentColor: () => [number, number, number, number],
): [number, number, number, number] {
    switch (c.type) {
        case "rgb":
            return [c.r, c.g, c.b, c.a];
        case "currentColor":
            return currentColor();
        default:
            throw Error(`TODO: Support ${c.type}`);
    }
}

export function parseColor(ts: TokenStream, _args: void): Color {
    const outerTs = ts;
    let tk = ts.nextToken();
    // Try hex notation --------------------------------------------------------
    if (tk.type === "hash") {
        ts.consumeToken();
        // https://www.w3.org/TR/css-color-4/#hex-notation
        let rStr,
            gStr,
            bStr,
            aStr = "ff";
        switch (tk.value.length) {
            case 3:
                // #rgb
                rStr = tk.value.charAt(0).repeat(2);
                gStr = tk.value.charAt(1).repeat(2);
                bStr = tk.value.charAt(2).repeat(2);
                break;
            case 4:
                // #rgba
                rStr = tk.value.charAt(0).repeat(2);
                gStr = tk.value.charAt(1).repeat(2);
                bStr = tk.value.charAt(2).repeat(2);
                aStr = tk.value.charAt(3).repeat(2);
                break;
            case 6:
                // #rrggbb
                rStr = tk.value.substring(0, 2);
                gStr = tk.value.substring(2, 4);
                bStr = tk.value.substring(4, 6);
                break;
            case 8:
                // #rrggbbaa
                rStr = tk.value.substring(0, 2);
                gStr = tk.value.substring(2, 4);
                bStr = tk.value.substring(4, 6);
                aStr = tk.value.substring(6, 8);
                break;
            default:
                throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        let r = parseInt(rStr, 16);
        let g = parseInt(gStr, 16);
        let b = parseInt(bStr, 16);
        let a = parseInt(aStr, 16);
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        return { type: "rgb", r, g, b, a };
    }
    // Try rgb()/rgba() function -----------------------------------------------
    if (
        tk.type === "ast-function" &&
        (tk.name === "rgb" || tk.name === "rgba")
    ) {
        outerTs.consumeToken();
        let ts = new TokenStream(tk.value);

        const parseAlpha = (): number => {
            let oldCursor = ts.cursor;
            try {
                return clamp(parseNumber(ts), 0, 1) * 255;
            } catch (e) {
                if (!(e instanceof CSSSyntaxError)) {
                    throw e;
                }
            }
            ts.cursor = oldCursor;
            try {
                return (clamp(parsePercentage(ts).num, 0, 100) / 100) * 255;
            } catch (e) {
                if (!(e instanceof CSSSyntaxError)) {
                    throw e;
                }
            }
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        };

        // https://www.w3.org/TR/css-color-4/#funcdef-rgb
        let cursorBeforeRgb = ts.cursor;
        let r,
            g,
            b,
            a = 255;

        //======================================================================
        // Try legacy syntax first
        //======================================================================
        // https://www.w3.org/TR/css-color-4/#typedef-legacy-rgb-syntax
        legacySyntax: {
            // rgb(<  >r  ,  g  ,  b  ) ----------------------------------------
            // rgb(<  >r  ,  g  ,  b  ,  a  ) ----------------------------------
            ts.skipWhitespaces();

            // rgb(  <r  ,  g  ,  b>  ) ----------------------------------------
            // rgb(  <r  ,  g  ,  b>  ,  a  ) ----------------------------------
            const per = ts.parseCommaSeparatedRepeation(0, 3, null, () => {
                return parsePercentage(ts);
            });
            if (per.length === 3) {
                // Percentage value
                const rPer = clamp(per[0].num, 0, 100);
                const gPer = clamp(per[1].num, 0, 100);
                const bBer = clamp(per[2].num, 0, 100);
                r = Math.floor((rPer / 100) * 255);
                g = Math.floor((gPer / 100) * 255);
                b = Math.floor((bBer / 100) * 255);
            } else if (per.length === 0) {
                const num = ts.parseCommaSeparatedRepeation(0, 3, null, () => {
                    return parseNumber(ts);
                });
                if (num.length === 3) {
                    r = Math.floor(clamp(num[0], 0, 255));
                    g = Math.floor(clamp(num[1], 0, 255));
                    b = Math.floor(clamp(num[2], 0, 255));
                } else {
                    break legacySyntax;
                }
            } else {
                throw new CSSSyntaxError(ts.prevOrFirstToken());
            }

            // rgb(  r  ,  g  ,  b<  >) ----------------------------------------
            // rgb(  r  ,  g  ,  b<  >,  a  ) ----------------------------------
            ts.skipWhitespaces();

            // rgb(  r  ,  g  ,  b  <,>  a  ) ----------------------------------
            const tk = ts.nextToken();
            if (tk.type === "comma") {
                ts.consumeToken();
                // rgb(  r  ,  g  ,  b  ,<  >a  ) ------------------------------
                ts.skipWhitespaces();
                // rgb(  r  ,  g  ,  b  ,  <a>  ) ------------------------------
                a = parseAlpha();
                // rgb(  r  ,  g  ,  b  ,  a<  >) ------------------------------
                ts.skipWhitespaces();
            }

            if (!ts.isEnd) {
                throw new CSSSyntaxError(ts.prevOrFirstToken());
            }

            return { type: "rgb", r, g, b, a };
        }
        ts.cursor = cursorBeforeRgb;

        //======================================================================
        // Try modern syntax
        //======================================================================
        // https://www.w3.org/TR/css-color-4/#typedef-modern-rgb-syntax

        // rgb(<  >r  g  b  ) --------------------------------------------------
        // rgb(<  >r  g  b  /  a  ) --------------------------------------------
        ts.skipWhitespaces();
        // rgb(  <r  g  b  >) --------------------------------------------------
        // rgb(  <r  g  b  >/  a  ) --------------------------------------------
        let components = [];
        for (let i = 0; i < 3; i++) {
            // rgb(  <r>  <g>  <b>  ) --------------------------------------
            // rgb(  <r>  <g>  <b>  /  a  ) --------------------------------

            const parseValue = (): number => {
                let oldCursor = ts.cursor;
                try {
                    return clamp(parseNumber(ts), 0, 1) * 255;
                } catch (e) {
                    if (!(e instanceof CSSSyntaxError)) {
                        throw e;
                    }
                }
                ts.cursor = oldCursor;
                try {
                    return (clamp(parsePercentage(ts).num, 0, 100) / 100) * 255;
                } catch (e) {
                    if (!(e instanceof CSSSyntaxError)) {
                        throw e;
                    }
                }
                ts.cursor = oldCursor;
                const tk = ts.nextToken();
                if (tk.type === "ident" && tk.value === "none") {
                    throw Error("TODO");
                }
                throw new CSSSyntaxError(ts.prevOrFirstToken());
            };
            components.push(parseValue());
            // rgb(  r<  >g<  >b<  >) --------------------------------------
            // rgb(  r<  >g<  >b<  >/  a  ) --------------------------------
            ts.skipWhitespaces();
        }
        // rgb(  r  g  b  </>  a  ) --------------------------------------------
        a = 255;
        tk = ts.nextToken();
        if (tk.type === "delim" && tk.value === "/") {
            ts.consumeToken();
            // rgb(  r  g  b  /<  >a  ) ----------------------------------------
            ts.skipWhitespaces();
            // rgb(  r  g  b  /  <a>  ) ----------------------------------------
            a = parseAlpha();
            // rgb(  r  g  b  /  a<  >) ----------------------------------------
            ts.skipWhitespaces();
        }

        if (!ts.isEnd) {
            throw new CSSSyntaxError(ts.prevOrFirstToken());
        }
        return {
            type: "rgb",
            r: components[0],
            g: components[1],
            b: components[2],
            a,
        };
    }
    // Try hsl()/hsla() function -----------------------------------------------
    if (
        tk.type === "ast-function" &&
        (tk.name === "hsl" || tk.name === "hsla")
    ) {
        throw Error("not implemented");
    }
    // Try hwb() function ------------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "hwb") {
        throw Error("not implemented");
    }
    // Try lab() function ------------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "lab") {
        throw Error("not implemented");
    }
    // Try lch() function ------------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "lch") {
        throw Error("not implemented");
    }
    // Try oklab() function ----------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "oklab") {
        throw Error("not implemented");
    }
    // Try oklch() function ----------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "oklch") {
        throw Error("not implemented");
    }
    // Try color() function ----------------------------------------------------
    if (tk.type === "ast-function" && tk.name === "color") {
        throw Error("not implemented");
    }
    // Try named color ---------------------------------------------------------
    if (tk.type === "ident" && namedColors.has(tk.value)) {
        ts.consumeToken();
        let v = namedColors.get(tk.value);
        if (v === undefined) {
            throw Error("unreachable");
        }
        return v;
    }
    // Try transparent ---------------------------------------------------------
    if (tk.type === "ident" && toAsciiLowercase(tk.value) === "transparent") {
        ts.consumeToken();
        return { type: "rgb", r: 0, g: 0, b: 0, a: 0 };
    }
    // Try currentColor --------------------------------------------------------
    if (tk.type === "ident" && toAsciiLowercase(tk.value) === "currentcolor") {
        ts.consumeToken();
        return { type: "currentColor" };
    }
    // TODO: Try system colors
    throw new CSSSyntaxError(ts.prevOrFirstToken());
}
