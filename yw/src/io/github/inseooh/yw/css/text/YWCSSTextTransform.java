package io.github.inseooh.yw.css.text;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public class YWCSSTextTransform {
	public enum CaseTransform {
		CAPITALIZE, UPPERCASE, LOWERCASE
	};
	
	private final CaseTransform caseTransform; /* May be null */
	// TODO: full-width, full-size-kana
	
	YWCSSTextTransform(CaseTransform caseTransform) {
		this.caseTransform = caseTransform;
	}

	public CaseTransform getCaseTransform() {
		return caseTransform;
	}
	
	public String apply(String text) {
		if (caseTransform != null) {
			switch (caseTransform) {
			case CAPITALIZE:
				return text.substring(1, 2).toUpperCase() + text.substring(2);
			case LOWERCASE:
				return text.toLowerCase();
			case UPPERCASE:
				return text.toUpperCase();
			}
		}
		return text;
	}
	
	public static YWCSSTextTransform parseTextTransform(YWCSSTokenStream ts) throws YWSyntaxError {
		CaseTransform caseTransform = null;
		while (caseTransform == null) {
			int cursorBeforeIdent = ts.getCursor();
			YWCSSToken.Ident ident = (YWCSSToken.Ident) ts.expectToken(YWCSSToken.Type.IDENT);
			if (ident == null) {
				break;
			}
			boolean gotSomething = false;
			if (caseTransform == null) {
				gotSomething = true;
				switch (ident.getValue()) {
				case "capitalize":
					caseTransform = CaseTransform.CAPITALIZE;
					break;
				case "uppercase":
					caseTransform = CaseTransform.UPPERCASE;
					break;
				case "lowercase":
					caseTransform = CaseTransform.UPPERCASE;
					break;
				default:
					gotSomething = false;
					break;
				}
			}
			// TODO: full-width, full-size-kana
			if (!gotSomething) {
				ts.setCursor(cursorBeforeIdent);
				break;
			}
			ts.skipWhitespaces();
		}
		if (caseTransform != null) {
			return new YWCSSTextTransform(caseTransform);
		}
		throw new YWSyntaxError();
	}
	
}
