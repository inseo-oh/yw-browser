
import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.ywsupport.YWCSSParserEntry;
import io.github.inseooh.ywsupport.YWCSSType;

@YWCSSType
public enum YWCSSFloat {
	NONE,
	LEFT,
	RIGHT;

	@YWCSSParserEntry
	public static YWCSSFloat parseFloat(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("none")) {
			return NONE;
		}
		if (ts.expectIdent("left")) {
			return LEFT;
		}
		if (ts.expectIdent("right")) {
			return RIGHT;
		}
		throw new YWSyntaxError();
	}

}
