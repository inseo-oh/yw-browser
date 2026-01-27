import { $Element } from "../dom";
import { Margin } from "./box_model";
import { Color } from "./color";
import { Display } from "./display";
import { Float } from "./float";
import { Size } from "./sizing";
import { TextTransform } from "./text";
import { TextDecorationLine, TextDecorationStyle } from "./text_decor";

export type ComputedStyleMap = {
    // Box model ---------------------------------------------------------------
    marginTop: Margin;
    marginRight: Margin;
    marginBottom: Margin;
    marginLeft: Margin;

    paddingTop: CSSUnitValue;
    paddingRight: CSSUnitValue;
    paddingBottom: CSSUnitValue;
    paddingLeft: CSSUnitValue;

    // Color -------------------------------------------------------------------
    color: Color;

    // Display -----------------------------------------------------------------
    display: Display;

    // Float -------------------------------------------------------------------
    float: Float;

    // Sizing ------------------------------------------------------------------
    width: Size;
    height: Size;
    minWidth: Size;
    minHeight: Size;
    maxWidth: Size;
    maxHeight: Size;

    // Text decoration ---------------------------------------------------------
    textDecorationLine: TextDecorationLine[];
    textDecorationStyle: TextDecorationStyle;
    textDecorationColor: Color;

    // Text --------------------------------------------------------------------
    textTransform: TextTransform | null;
};

function computedStyleMapFrom(elem: $Element) {
    const sv = (s: string) => computedPropertyFrom(elem, s);

    // Box model -----------------------------------------------------------
    this.marginTop = marginFromSV(sv("margin-top"));
    this.marginRight = marginFromSV(sv("margin-right"));
    this.marginBottom = marginFromSV(sv("margin-bottom"));
    this.marginLeft = marginFromSV(sv("margin-left"));

    this.paddingTop = lengthFromSV(sv("padding-top"));
    this.paddingRight = lengthFromSV(sv("padding-right"));
    this.paddingBottom = lengthFromSV(sv("padding-bottom"));
    this.paddingLeft = lengthFromSV(sv("padding-left"));

    // Color ---------------------------------------------------------------
    this.color = colorFromSV(sv("color"));

    // Display -------------------------------------------------------------
    this.display = displayFromSV(sv("display"));

    // Float ---------------------------------------------------------------
    this.float = floatFromSV(sv("float"));

    // Sizing --------------------------------------------------------------
    this.width = sizeFromSV(sv("width"));
    this.height = sizeFromSV(sv("height"));
    this.minWidth = sizeFromSV(sv("min-width"));
    this.minHeight = sizeFromSV(sv("min-height"));
    this.maxWidth = sizeFromSV(sv("max-width"));
    this.maxHeight = sizeFromSV(sv("max-height"));

    // Text decoration -----------------------------------------------------
    this.textDecorationLine = textDecorationLineFromSV(
        sv("text-decoration-line"),
    );
    this.textDecorationStyle = textDecorationStyleFromSV(
        sv("text-decoration-style"),
    );
    this.textDecorationColor = colorFromSV(sv("text-decoration-color"));

    // Text ----------------------------------------------------------------
    this.textTransform = textTransformFromSV(sv("text-transform"));
}
