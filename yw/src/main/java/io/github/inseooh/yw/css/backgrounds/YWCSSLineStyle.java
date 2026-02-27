package io.github.inseooh.yw.css.backgrounds;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public enum YWCSSLineStyle {
    NONE,
    HIDDEN,
    DOTTED,
    DASHED,
    SOLID,
    DOUBLE,
    GROOVE,
    RIDGE,
    INSET,
    OUTSET;

    public static YWCSSLineStyle parseLineStyle(YWCSSTokenStream ts) throws YWSyntaxError {
        if (ts.expectIdent("none")) {
            return NONE;
        }
        if (ts.expectIdent("hidden")) {
            return HIDDEN;
        }
        if (ts.expectIdent("dotted")) {
            return DOTTED;
        }
        if (ts.expectIdent("dashed")) {
            return DASHED;
        }
        if (ts.expectIdent("solid")) {
            return SOLID;
        }
        if (ts.expectIdent("double")) {
            return DOUBLE;
        }
        if (ts.expectIdent("groove")) {
            return GROOVE;
        }
        if (ts.expectIdent("ridge")) {
            return RIDGE;
        }
        if (ts.expectIdent("inset")) {
            return INSET;
        }
        if (ts.expectIdent("outset")) {
            return OUTSET;
        }
        throw new YWSyntaxError();
    }
}
