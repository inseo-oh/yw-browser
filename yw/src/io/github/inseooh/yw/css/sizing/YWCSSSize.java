package io.github.inseooh.yw.css.sizing;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;

public class YWCSSSize {
//	public static final YWCSSSize NONE = new YWCSSSize(Type.NONE);
	public static final YWCSSSize AUTO = new YWCSSSize(Type.AUTO);
//	public static final YWCSSSize MIN_CONTENT = new YWCSSSize(Type.MIN_CONTENT);
//	public static final YWCSSSize MAX_CONTENT = new YWCSSSize(Type.MAX_CONTENT);
//	public static final YWCSSSize FIT_CONTENT = new YWCSSSize(Type.FIT_CONTENT);

	public enum Type {
//		NONE, MIN_CONTENT, MAX_CONTENT, FIT_CONTENT,
		AUTO,
		MANUAL_SIZE
	}

	private final Type type;
	private final YWCSSLength size; // Only valid for MANUAL_SIZE

	public YWCSSSize(YWCSSLength size) {
		this.type = Type.MANUAL_SIZE;
		this.size = size;
	}

	private YWCSSSize(Type type) {
		if (type == Type.MANUAL_SIZE) {
			throw new RuntimeException("do not use this constructor for MANUAL_SIZE");
		}
		this.type = type;
		this.size = null;
	}

	public Type getType() {
		return type;
	}

	public YWCSSLength getSize() {
		return size;
	}
	
	public float computeUsedValue(float fontSize, float containerSize) {
		switch (type) {
		case AUTO:
			throw new RuntimeException("auto size must be handled by caller");
		case MANUAL_SIZE:
			return size.toPx(fontSize, containerSize);
		}
		throw new RuntimeException("bad size type");
	}
	
	public static class ParseOptions {
		public boolean acceptAuto = false;
	};
	public static YWCSSSize parseSizeValue(YWCSSTokenStream ts, ParseOptions options) throws YWSyntaxError {
		if (options.acceptAuto && ts.expectIdent("auto")) {
			return AUTO;
		}
		// TODO: none (if allowed)
		// TODO: min-content
		// TODO: max-content
		// TODO: fit-content
		return new YWCSSSize(YWCSSLength.parseLengthOrPercentage(ts));
	}
	public static YWCSSSize parseSizeValue(YWCSSTokenStream ts) throws YWSyntaxError {
		return parseSizeValue(ts, new ParseOptions());
	}

}
