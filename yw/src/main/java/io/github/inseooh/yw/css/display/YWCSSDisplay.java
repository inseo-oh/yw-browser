package io.github.inseooh.yw.css.display;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;

public class YWCSSDisplay {
	public static final YWCSSDisplay NONE = new YWCSSDisplay(Type.NONE);

	public enum OuterMode {
		BLOCK, INLINE,
//		RUN_IN
	}

	public enum InnerMode {
		FLOW, FLOW_ROOT,
//		TABLE, FLEX, GRID, RUBY
	}

	/**
	 * TODO: Implement [display: contents], [display: list-item], and <a href=
	 * "https://www.w3.org/TR/css-display-3/#layout-specific-display">these</a>
	 * modes.
	 */
	public enum Type {
		NORMAL, NONE,
	}

	private final Type type;
	private final OuterMode outerMode;
	private final InnerMode innerMode;

	public YWCSSDisplay(OuterMode outerMode, InnerMode innerMode) {
		this.type = Type.NORMAL;
		this.outerMode = outerMode;
		this.innerMode = innerMode;
	}

	private YWCSSDisplay(Type type) {
		if (type == Type.NORMAL) {
			throw new RuntimeException("do not use this constructor for NORMAL");
		}
		this.type = type;
		this.outerMode = null;
		this.innerMode = null;
	}

	public OuterMode getOuterMode() {
		return outerMode;
	}

	public InnerMode getInnerMode() {
		return innerMode;
	}

	public Type getType() {
		return type;
	}

	public static YWCSSDisplay parseDisplay(YWCSSTokenStream ts) throws YWSyntaxError {
		// Try legacy keyword first --------------------------------------------
		if (ts.expectIdent("inline-block")) {
			return new YWCSSDisplay(OuterMode.INLINE, InnerMode.FLOW_ROOT);
		}
		if (ts.expectIdent("inline-table")) {
			// TODO
//			return new YWCSSDisplay(OuterMode.INLINE, InnerMode.TABLE);
		}
		if (ts.expectIdent("inline-flex")) {
			// TODO
//			return new YWCSSDisplay(OuterMode.INLINE, InnerMode.FLEX);
		}
		if (ts.expectIdent("inline-grid")) {
			// TODO
//			return new YWCSSDisplay(OuterMode.INLINE, InnerMode.GRID);
		}
		// Try < display-outside > < display-inside > ------------------------------

		OuterMode outerMode = null;
		InnerMode innerMode = null;
		while (outerMode == null || innerMode == null) {
			int cursorBeforeIdent = ts.getCursor();
			YWCSSToken.Ident ident = (YWCSSToken.Ident) ts.expectToken(YWCSSToken.Type.IDENT);
			if (ident == null) {
				break;
			}
			boolean gotSomething = false;
			if (outerMode == null) {
				gotSomething = true;
				switch (ident.getValue()) {
				case "block":
					outerMode = OuterMode.BLOCK;
					break;
				case "inline":
					outerMode = OuterMode.INLINE;
					break;
//				case "run-in":
//					outerMode = OuterMode.RUN_IN;
//					break;
				default:
					gotSomething = false;
					break;
				}
			}
			if (innerMode == null) {
				gotSomething = true;
				switch (ident.getValue()) {
				case "flow":
					innerMode = InnerMode.FLOW;
					break;
				case "flow-root":
					innerMode = InnerMode.FLOW_ROOT;
					break;
//				case "table":
//					innerMode = InnerMode.TABLE;
//					break;
//				case "flex":
//					innerMode = InnerMode.FLEX;
//					break;
//				case "grid":
//					innerMode = InnerMode.GRID;
//					break;
//				case "ruby":
//					innerMode = InnerMode.RUBY;
//					break;
				default:
					gotSomething = false;
					break;
				}
			}
			if (!gotSomething) {
				ts.setCursor(cursorBeforeIdent);
				break;
			}
		}
		if (outerMode != null || innerMode != null) {
			if (innerMode == null) {
				innerMode = InnerMode.FLOW;
			} else if (outerMode == null) {
//				if (innerMode == InnerMode.RUBY) {
//					outerMode = OuterMode.INLINE;
//				} else {
				outerMode = OuterMode.BLOCK;
//				}
			}
			return new YWCSSDisplay(outerMode, innerMode);
		}

		// TODO: < display-listitem >
		// TODO: < display-internal >

		// Try display-box -----------------------------------------------------
		// TODO: display: contents
		if (ts.expectIdent("none")) {
			return YWCSSDisplay.NONE;
		}

		throw new YWSyntaxError();
	}

}
