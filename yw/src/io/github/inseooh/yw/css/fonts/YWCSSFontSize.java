package io.github.inseooh.yw.css.fonts;

import java.util.HashMap;
import java.util.Map;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;

public interface YWCSSFontSize {
	float toComputedValue(float parentFontSize);

	public static enum Absolute implements YWCSSFontSize {
		XX_SMALL, X_SMALL, SMALL, MEDIUM, LARGE, X_LARGE, XX_LARGE;

		private static final Map<Absolute, Float> SIZE_MAP = new HashMap<>();
		private static final float PREFERRED_FONT_SIZE = 14; // XXX: Let user choose this size!

		static {
			SIZE_MAP.put(XX_SMALL, (PREFERRED_FONT_SIZE * 3) / 5);
			SIZE_MAP.put(X_SMALL, (PREFERRED_FONT_SIZE * 3) / 4);
			SIZE_MAP.put(SMALL, (PREFERRED_FONT_SIZE * 8) / 9);
			SIZE_MAP.put(MEDIUM, PREFERRED_FONT_SIZE);
			SIZE_MAP.put(LARGE, (PREFERRED_FONT_SIZE * 6) / 5);
			SIZE_MAP.put(X_LARGE, (PREFERRED_FONT_SIZE * 3) / 2);
			SIZE_MAP.put(XX_LARGE, (PREFERRED_FONT_SIZE * 2) / 1);
		}

		public static Absolute fromPx(float size) {
			float minDiff = Float.MAX_VALUE;
			Absolute resSize = null;
			for (Map.Entry<Absolute, Float> e : SIZE_MAP.entrySet()) {
				float diff = Math.abs(size - e.getValue());
				if (diff < minDiff) {
					resSize = e.getKey();
					minDiff = diff;
				}
			}
			return resSize;
		}

		public Absolute smaller() {
			switch (this) {
			case XX_SMALL:
			case X_SMALL:
				return XX_SMALL;
			case SMALL:
				return X_SMALL;
			case MEDIUM:
				return SMALL;
			case LARGE:
				return MEDIUM;
			case X_LARGE:
				return LARGE;
			case XX_LARGE:
				return X_LARGE;
			}
			throw new RuntimeException("Unknown size");
		}

		public Absolute larger() {
			switch (this) {
			case XX_SMALL:
				return X_SMALL;
			case X_SMALL:
				return SMALL;
			case SMALL:
				return MEDIUM;
			case MEDIUM:
				return LARGE;
			case LARGE:
				return X_LARGE;
			case X_LARGE:
			case XX_LARGE:
				return XX_LARGE;
			}
			throw new RuntimeException("Unknown size");
		}

		@Override
		public float toComputedValue(float parentFontSize) {
			return SIZE_MAP.get(this);
		}
	}

	public static enum Relative implements YWCSSFontSize {
		LARGER, SMALLER;

		@Override
		public float toComputedValue(float parentFontSize) {
			switch (this) {
			case LARGER:
				return Absolute.fromPx(parentFontSize).larger().toComputedValue(parentFontSize);
			case SMALLER:
				return Absolute.fromPx(parentFontSize).larger().toComputedValue(parentFontSize);
			}
			throw new RuntimeException("Unknown size");
		}
	}

	public static class Length implements YWCSSFontSize {
		private final YWCSSLength length;

		public Length(YWCSSLength length) {
			this.length = length;
		}

		public YWCSSLength getLength() {
			return length;
		}

		@Override
		public float toComputedValue(float parentFontSize) {
			return length.toPx(parentFontSize, parentFontSize);
		}
	}

	public static YWCSSFontSize parseFontSize(YWCSSTokenStream ts) throws YWSyntaxError {
		if (ts.expectIdent("xx-small")) {
			return Absolute.XX_SMALL;
		}
		if (ts.expectIdent("x-small")) {
			return Absolute.X_SMALL;
		}
		if (ts.expectIdent("small")) {
			return Absolute.SMALL;
		}
		if (ts.expectIdent("medium")) {
			return Absolute.MEDIUM;
		}
		if (ts.expectIdent("large")) {
			return Absolute.LARGE;
		}
		if (ts.expectIdent("x-large")) {
			return Absolute.X_LARGE;
		}
		if (ts.expectIdent("xx-large")) {
			return Absolute.XX_LARGE;
		}
		if (ts.expectIdent("larger")) {
			return Relative.LARGER;
		}
		if (ts.expectIdent("smaller")) {
			return Relative.SMALLER;
		}
		return new Length(YWCSSLength.parseLengthOrPercentage(ts));
	}

}
