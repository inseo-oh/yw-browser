package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.ywsupport.YWCSSParserEntry;
import io.github.inseooh.ywsupport.YWCSSType;

@YWCSSType
public enum YWCSSFontStyle {
	NORMAL, ITALIC, OBLIQUE;

	@YWCSSParserEntry
	public static YWCSSFontStyle parseFontStretch(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("normal")) {
			return NORMAL;
		}
		if (ts.expectIdent("italic")) {
			return ITALIC;
		}
		if (ts.expectIdent("oblique")) {
			return OBLIQUE;
		}
		throw new YWSyntaxError();
	}
}
