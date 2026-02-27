package io.github.inseooh.yw;

public class YWUtility {
	public static boolean isLeadingSurrogateChar(int codePoint) {
		return 0xd800 <= codePoint && codePoint <= 0xdbff;
	}

	public static boolean isTrailingSurrogateChar(int codePoint) {
		return 0xdc00 <= codePoint && codePoint <= 0xdfff;
	}

	public static boolean isSurrogateChar(int codePoint) {
		return isLeadingSurrogateChar(codePoint) || isTrailingSurrogateChar(codePoint);
	}

	public static boolean isWhitespace(int codePoint) {
		switch (codePoint) {
		case 0x0009:
		case 0x000a:
		case 0x000c:
		case 0x000d:
			return true;
		}
		return false;
	}

	public static String removeLeadingWhitespace(String s) {
		for (int i = 0; i < s.length(); i++) {
			if (!isWhitespace(s.charAt(i))) {
				return s.substring(i);
			}
		}
		return "";
	}

	public static String removeTrailingWhitespace(String s) {
		for (int i = s.length() - 1; 0 <= i; i--) {
			if (!isWhitespace(s.charAt(i))) {
				return s.substring(0, i + 1);
			}
		}
		return "";
	}
	
	public static String removeLeadingAndTrailingWhitespace(String s) {
		return removeTrailingWhitespace(removeLeadingWhitespace(s));
	}

	public static boolean isNoncharacter(int codePoint) {
		switch (codePoint) {
		case 0xfffe:
		case 0xffff:
		case 0x1fffe:
		case 0x1ffff:
		case 0x2fffe:
		case 0x2ffff:
		case 0x3fffe:
		case 0x3ffff:
		case 0x4fffe:
		case 0x4ffff:
		case 0x5fffe:
		case 0x5ffff:
		case 0x6fffe:
		case 0x6ffff:
		case 0x7fffe:
		case 0x7ffff:
		case 0x8fffe:
		case 0x8ffff:
		case 0x9fffe:
		case 0x9ffff:
		case 0xafffe:
		case 0xaffff:
		case 0xbfffe:
		case 0xbffff:
		case 0xcfffe:
		case 0xcffff:
		case 0xdfffe:
		case 0xdffff:
		case 0xefffe:
		case 0xeffff:
		case 0xffffe:
		case 0xfffff:
		case 0x10fffe:
		case 0x10ffff:
			return true;
		}
		return false;
	}

	public static boolean isC0ControlCharacter(int codePoint) {
		return 0x0000 <= codePoint && codePoint <= 0x001f;
	}

	public static boolean isControlCharacter(int codePoint) {
		return isC0ControlCharacter(codePoint) || (0x007f <= codePoint && codePoint <= 0x009f);
	}

	public static boolean isAsciiDigit(int codePoint) {
		return '0' <= codePoint && codePoint <= '9';
	}

	public static boolean isAsciiUppercase(int codePoint) {
		return 'A' <= codePoint && codePoint <= 'Z';
	}

	public static boolean isAsciiLowercase(int codePoint) {
		return 'a' <= codePoint && codePoint <= 'z';
	}

	public static boolean isAsciiAlpha(int codePoint) {
		return isAsciiUppercase(codePoint) || isAsciiLowercase(codePoint);
	}

	public static boolean isAsciiAlphanumeric(int codePoint) {
		return isAsciiAlpha(codePoint) || isAsciiDigit(codePoint);
	}

	public static boolean isAsciiUppercaseHexDigit(int codePoint) {
		return 'A' <= codePoint && codePoint <= 'F';
	}

	public static boolean isAsciiLowercaseHexDigit(int codePoint) {
		return 'a' <= codePoint && codePoint <= 'f';
	}

	public static boolean isAsciiHexDigit(int codePoint) {
		return isAsciiUppercaseHexDigit(codePoint) || isAsciiLowercaseHexDigit(codePoint) || isAsciiDigit(codePoint);
	}

	static int toAsciiUppercase(int codePoint) {
		return !isAsciiUppercase(codePoint) ? codePoint : (codePoint - 'A' + 'a');
	}

	static int toAsciiLowercase(int codePoint) {
		return !isAsciiLowercase(codePoint) ? codePoint : (codePoint - 'A' + 'a');
	}

	public static boolean stringEqIgnoreAsciiCase(String a, String b) {
		if (a.length() != b.length()) {
			return false;
		}
		for (int i = 0; i < a.length(); i++) {
			int cpA = toAsciiLowercase(a.codePointAt(i));
			int cpB = toAsciiLowercase(b.codePointAt(i));
			if (cpA != cpB) {
				return false;
			}
		}
		return true;
	}

	public static boolean stringHasPrefixIgnoreAsciiCase(String s, String prefix) {
		if (s.length() < prefix.length()) {
			return false;
		}
		for (int i = 0; i < prefix.length(); i++) {
			int cpA = toAsciiLowercase(s.codePointAt(i));
			int cpB = toAsciiLowercase(prefix.codePointAt(i));
			if (cpA != cpB) {
				return false;
			}
		}
		return true;
	}
	
	public static float clamp(float val, float min, float max) {
	    return Math.max(min, Math.min(max, val));
	}

}
