package io.github.inseooh.yw.css.fonts;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSNumber;
import io.github.inseooh.ywsupport.YWCSSParserEntry;
import io.github.inseooh.ywsupport.YWCSSType;

@YWCSSType(resultType = Integer.class)
public class YWCSSFontWeight {
	public static final int NORMAL = 400;
	public static final int BOLD = 800;

	private final int value;

	public YWCSSFontWeight(int value) {
		this.value = value;
	}

	public int getValue() {
		return value;
	}

	@YWCSSParserEntry
	public static int parseFontWeight(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("normal")) {
			return NORMAL;
		}
		if (ts.expectIdent("bold")) {
			return BOLD;
		}
		return (int) YWCSSNumber.parseNumber(ts);
	}

}
