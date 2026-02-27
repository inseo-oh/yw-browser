package io.github.inseooh.yw.css.box;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;

public class YWCSSMargin {
    public static final YWCSSMargin AUTO = new YWCSSMargin();
    private final YWCSSLength value;
    private final boolean isAuto;

    public YWCSSMargin(YWCSSLength value) {
        this.value = value;
        this.isAuto = false;
    }
    private YWCSSMargin() {
        this.value = null;
        this.isAuto = true;
    }

    public YWCSSLength getValue() {
        return value;
    }

    public boolean isAuto() {
        return isAuto;
    }

    public static YWCSSMargin parseMargin(YWCSSTokenStream ts) throws YWSyntaxError {
        if (ts.expectIdent("auto")) {
            return AUTO;
        }
        return new YWCSSMargin(YWCSSLength.parseLengthOrPercentage(ts));
    }
}
