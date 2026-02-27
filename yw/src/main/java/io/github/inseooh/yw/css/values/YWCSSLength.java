package io.github.inseooh.yw.css.values;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

/**
 * @see <a href="https://www.w3.org/TR/css-values-3/#length-value">Relevant
 * section in CSS specification</a>
 */
public class YWCSSLength {
    public enum Unit {
        PERCENTAGE,

        /*
         * Relative lengths https://www.w3.org/TR/css-values-3/#relative-lengths
         */

        EM, EX, CH, REM, VW, VH, VMIN, VMAX,

        /*
         * Absolute lengths https://www.w3.org/TR/css-values-3/#absolute-lengths
         */

        CM, MM, Q, PC, PT, PX,
    }

    private float value;
    private Unit unit;

    public YWCSSLength(float value, Unit unit) {
        this.value = value;
        this.unit = unit;
    }

    public float getValue() {
        return this.value;
    }

    public Unit getUnit() {
        return this.unit;
    }

    public float toPx(float fontSize, float containerSize) {
        switch (this.unit) {
            case PERCENTAGE:
                return (this.value * containerSize) / 100;
            case EM:
                return fontSize * this.value;
            case EX:
            case PT:
            case PC:
            case Q:
            case MM:
            case CM:
            case VMAX:
            case VMIN:
            case VH:
            case VW:
            case REM:
            case CH:
                throw new RuntimeException("TODO");
            case PX:
                return this.value;
            default:
                throw new RuntimeException("unreachable");
        }
    }

    public static class ParseOptions {
        public boolean allowZeroShorthand = true;
        public boolean allowNegative = true;
    }

    public static YWCSSLength parseLength(YWCSSTokenStream ts, ParseOptions options) throws YWSyntaxError {
        int oldCursor = ts.getCursor();
        YWCSSToken.Dimension dimTk = (YWCSSToken.Dimension) ts.expectToken(YWCSSToken.Type.DIMENSION);
        float lenValue;
        Unit lenUnit;

        if (dimTk == null) {
            if (options.allowZeroShorthand) {
                YWCSSToken.Number numTk = (YWCSSToken.Number) ts.expectToken(YWCSSToken.Type.NUMBER);
                if (numTk != null && numTk.getValue() == 0) {
                    return new YWCSSLength(0, Unit.PX);
                }
            }
            ts.setCursor(oldCursor);
            throw new YWSyntaxError();
        }
        lenValue = dimTk.getValue();
        switch (dimTk.getUnit()) {
            case "em":
                lenUnit = Unit.EM;
                break;
            case "ex":
                lenUnit = Unit.EX;
                break;
            case "ch":
                lenUnit = Unit.CH;
                break;
            case "rem":
                lenUnit = Unit.REM;
                break;
            case "vw":
                lenUnit = Unit.VW;
                break;
            case "vh":
                lenUnit = Unit.VH;
                break;
            case "vmin":
                lenUnit = Unit.VMIN;
                break;
            case "vmax":
                lenUnit = Unit.VMAX;
                break;
            case "cm":
                lenUnit = Unit.CM;
                break;
            case "mm":
                lenUnit = Unit.MM;
                break;
            case "q":
                lenUnit = Unit.Q;
                break;
            case "pc":
                lenUnit = Unit.PC;
                break;
            case "pt":
                lenUnit = Unit.PT;
                break;
            case "px":
                lenUnit = Unit.PX;
                break;
            default:
                /* Bad unit */
                throw new YWSyntaxError();
        }
        return new YWCSSLength(lenValue, lenUnit);
    }

    public static YWCSSLength parseLength(YWCSSTokenStream ts) throws YWSyntaxError {
        return parseLength(ts, new ParseOptions());
    }

    public static YWCSSLength parsePercentage(YWCSSTokenStream ts) throws YWSyntaxError {
        YWCSSToken.Percentage tk = (YWCSSToken.Percentage) ts.expectToken(YWCSSToken.Type.PERCENTAGE);
        if (tk == null) {
            throw new YWSyntaxError();
        }
        return new YWCSSLength(tk.getValue(), YWCSSLength.Unit.PERCENTAGE);
    }

    public static YWCSSLength parseLengthOrPercentage(YWCSSTokenStream ts, ParseOptions options) throws YWSyntaxError {
        if (ts.expectToken(YWCSSToken.Type.DIMENSION) != null) {
            return parseLength(ts, options);
        }
        if (ts.expectToken(YWCSSToken.Type.PERCENTAGE) != null) {
            return parsePercentage(ts);
        }
        throw new YWSyntaxError();
    }

    public static YWCSSLength parseLengthOrPercentage(YWCSSTokenStream ts) throws YWSyntaxError {
        return parseLengthOrPercentage(ts, new ParseOptions());
    }
}
