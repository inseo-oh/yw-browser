package io.github.inseooh.yw.css.textdecor;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public enum YWCSSTextDeocrationStyle {
	SOLID, DOUBLE, DOTTED, DASHED, WAVY;

	public static YWCSSTextDeocrationStyle parseTextTransform(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("solid")) {
			return SOLID;
		}
		if (ts.expectIdent("double")) {
			return DOUBLE;
		}
		if (ts.expectIdent("dotted")) {
			return DOTTED;
		}
		if (ts.expectIdent("dashed")) {
			return DASHED;
		}
		if (ts.expectIdent("wavy")) {
			return WAVY;
		}
		throw new YWSyntaxError();
	}
}
