package io.github.inseooh.yw.css.box;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;

public class YWCSSPadding {
    public static YWCSSLength parsePadding(YWCSSTokenStream ts) throws YWSyntaxError {
        YWCSSLength.ParseOptions options = new YWCSSLength.ParseOptions();
        options.allowNegative = false;
        return YWCSSLength.parseLengthOrPercentage(ts, options);
    }
}
