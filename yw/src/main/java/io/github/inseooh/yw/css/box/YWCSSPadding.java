package io.github.inseooh.yw.css.box;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;
import io.github.inseooh.ywapt.YWCSSParserEntry;
import io.github.inseooh.ywapt.YWCSSType;

@YWCSSType
public class YWCSSPadding {
    @YWCSSParserEntry
    public static YWCSSLength parsePadding(YWCSSTokenStream ts) throws YWSyntaxError {
        YWCSSLength.ParseOptions options = new YWCSSLength.ParseOptions();
        options.allowNegative = false;
        return YWCSSLength.LengthOrPercentage.parseLengthOrPercentage(ts, options);
    }
}
