package io.github.inseooh.yw.css.textdecor;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public class YWCSSTextDecorationLine {
	private boolean underline = false;
	private boolean overline = false;
	private boolean lineThrough = false;
	private boolean blink = false;

	public boolean isUnderline() {
		return underline;
	}

	public void setUnderline(boolean underline) {
		this.underline = underline;
	}

	public boolean isOverline() {
		return overline;
	}

	public void setOverline(boolean overline) {
		this.overline = overline;
	}

	public boolean isLineThrough() {
		return lineThrough;
	}

	public void setLineThrough(boolean lineThrough) {
		this.lineThrough = lineThrough;
	}

	public boolean isBlink() {
		return blink;
	}

	public void setBlink(boolean blink) {
		this.blink = blink;
	}
	
	public static YWCSSTextDecorationLine parseTextTransform(YWCSSTokenStream ts) throws YWSyntaxError {
		YWCSSTextDecorationLine res = new YWCSSTextDecorationLine();
		boolean gotAny = false;
		while (true) {
			int cursorBeforeIdent = ts.getCursor();
			YWCSSToken.Ident ident = (YWCSSToken.Ident) ts.expectToken(YWCSSToken.Type.IDENT);
			if (ident == null) {
				break;
			}
			boolean gotSomething = false;
			gotAny = true;
			switch (ident.getValue()) {
			case "underline":
				res.underline = true;
				break;
			case "overline":
				res.overline = true;
				break;
			case "line-through":
				res.lineThrough = true;
				break;
			case "blink":
				res.blink = true;
				break;
			default:
				gotSomething = false;
				break;
			}
			if (!gotSomething) {
				ts.setCursor(cursorBeforeIdent);
				break;
			}
			ts.skipWhitespaces();
		}
		if (gotAny) {
			return res;
		}
		throw new YWSyntaxError();
	}

}
