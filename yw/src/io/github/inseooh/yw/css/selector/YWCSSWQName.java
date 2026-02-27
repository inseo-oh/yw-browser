package io.github.inseooh.yw.css.selector;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSToken.Ident;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public class YWCSSWQName {
	private final String nsPrefix; // May be null
	private final String name;

	public YWCSSWQName(String nsPrefix, String name) {
		this.nsPrefix = nsPrefix;
		this.name = name;
	}

	public String getNsPrefix() {
		return nsPrefix;
	}

	public String getName() {
		return name;
	}

	public static YWCSSWQName parseWQName(YWCSSTokenStream ts) throws YWSyntaxError {
		int oldCursor = ts.getCursor();

		String nsPrefix = null;
		try {
			nsPrefix = YWCSSNSPrefix.parseNSPrefix(ts);
		} catch (YWSyntaxError e) {
			ts.setCursor(oldCursor);
		}
		YWCSSToken.Ident ident = (Ident) ts.expectToken(YWCSSToken.Type.IDENT);
		if (ident == null) {
			throw new YWSyntaxError();
		}
		return new YWCSSWQName(nsPrefix, ident.getValue());
	}

}
