package io.github.inseooh.yw.css.values;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

/**
 * @see <a href="https://www.w3.org/TR/css-values-3/#number-value">Relevant
 *      section in CSS specification</a>
 */
public class YWCSSNumber {
	public static float parseNumber(YWCSSTokenStream ts) throws YWSyntaxError {
		YWCSSToken.Number tk = (YWCSSToken.Number) ts.expectToken(YWCSSToken.Type.NUMBER);
		if (tk == null) {
			throw new YWSyntaxError();
		}
		return tk.getValue();
	}
}
