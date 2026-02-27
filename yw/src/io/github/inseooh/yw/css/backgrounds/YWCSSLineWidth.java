package io.github.inseooh.yw.css.backgrounds;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;

public class YWCSSLineWidth {
    public static final YWCSSLength THIN = new YWCSSLength(1, YWCSSLength.Unit.PX);
    public static final YWCSSLength MEDIUM = new YWCSSLength(3, YWCSSLength.Unit.PX);
    public static final YWCSSLength THICK = new YWCSSLength(5, YWCSSLength.Unit.PX);

    public static YWCSSLength parseLineWidth(YWCSSTokenStream ts) throws YWSyntaxError {
        if (ts.expectIdent("thin")) {
            return THIN;
        }
        if (ts.expectIdent("medium")) {
            return MEDIUM;
        }
        if (ts.expectIdent("thick")) {
            return THICK;
        }
        return YWCSSLength.parseLength(ts);
    }
}
