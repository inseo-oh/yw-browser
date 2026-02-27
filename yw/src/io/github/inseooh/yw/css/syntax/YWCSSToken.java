package io.github.inseooh.yw.css.syntax;

public class YWCSSToken {
	public enum Type {
		WHITESPACE, LEFT_PAREN, RIGHT_PAREN, COMMA, COLON, SEMICOLON, LEFT_SQUARE_BRACKET, RIGHT_SQUARE_BRACKET,
		LEFT_CURLY_BRACKET, RIGHT_CURLY_BRACKET, CDO, CDC, BAD_STRING, BAD_URL, NUMBER, PERCENTAGE, DIMENSION, STRING,
		URL, AT_KEYWORD, FUNCTION_KEYWORD, IDENT, HASH, DELIM,

		/* High-level objects *****************************************************/

		AST_SIMPLE_BLOCK, AST_FUNCTION, AST_QUALIFIED_RULE, AST_AT_RULE, AST_DECLARATION,
	}

    private final Type type;

	public YWCSSToken(Type type) {
		this.type = type;
	}

	public Type getType() {
		return this.type;
	}

	public enum NumType {
		INTEGER, NUMBER
	}

	
	public static class Number extends YWCSSToken {
		private final float value;
		private final NumType numType;

		public Number(float value, NumType numType) {
			super(Type.NUMBER);
			this.value = value;
			this.numType = numType;
		}

		public float getValue() {
			return this.value;
		}

		public NumType getNumType() {
			return this.numType;
		}
	}

	public static class Percentage extends YWCSSToken {
		private final float value;
		private NumType numType;
		public Percentage(float value, NumType numType) {
			super(Type.PERCENTAGE);
			this.value = value;
		}

		public float getValue() {
			return this.value;
		}
		public NumType getNumType() {
			return this.numType;
		}
	}

    public static class Dimension extends YWCSSToken {
		private final float value;
		private NumType numType;
		private final String unit;

		public Dimension(float value, NumType numType, String unit) {
			super(Type.DIMENSION);
			this.value = value;
			this.unit = unit;
		}

		public float getValue() {
			return this.value;
		}

		public String getUnit() {
			return this.unit;
		}
		public NumType getNumType() {
			return this.numType;
		}
	}

	public static class Str extends YWCSSToken {
		private final String value;

		public Str(String value) {
			super(Type.STRING);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}
	}

    public static class Url extends YWCSSToken {
		private final String value;

		public Url(String value) {
			super(Type.STRING);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}
	}

    public static class AtKeyword extends YWCSSToken {
		private final String value;

		public AtKeyword(String value) {
			super(Type.AT_KEYWORD);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}
	}

    public static class FunctionKeyword extends YWCSSToken {
		private final String value;

		public FunctionKeyword(String value) {
			super(Type.FUNCTION_KEYWORD);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}
	}

    public static class Ident extends YWCSSToken {
		private final String value;

		public Ident(String value) {
			super(Type.IDENT);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}
	}

    public static class Delim extends YWCSSToken {
		private final int codePoint;

		public Delim(int codePoint) {
			super(Type.DELIM);
			this.codePoint = codePoint;
		}

		public int getValue() {
			return this.codePoint;
		}
	}

	public static class Hash extends YWCSSToken {
		private final String value;
		private HashType hashType;

		public enum HashType {
			ID, UNRESTRICTED
		}

		public Hash(String value, HashType hashType) {
			super(Type.HASH);
			this.value = value;
		}

		public String getValue() {
			return this.value;
		}

		public HashType getHashType() {
			return this.hashType;
		}
	}

	public static class ASTFunction extends YWCSSToken {
		private final String name;
		private final YWCSSToken[] tokens;

		public ASTFunction(String name, YWCSSToken[] tokens) {
			super(Type.AST_FUNCTION);
			this.name = name;
			this.tokens = tokens;
		}

		public String getName() {
			return this.name;
		}

		public YWCSSToken[] getTokens() {
			return this.tokens;
		}
	}

	public static class ASTQualifiedRule extends YWCSSToken {
		private final YWCSSToken[] preludeTokens;
		private final YWCSSToken[] bodyTokens;

		public ASTQualifiedRule(YWCSSToken[] preludeTokens, YWCSSToken[] bodyTokens) {
			super(Type.AST_QUALIFIED_RULE);
			this.preludeTokens = preludeTokens;
			this.bodyTokens = bodyTokens;
		}

		public YWCSSToken[] getPreludeTokens() {
			return this.preludeTokens;
		}

		public YWCSSToken[] getBodyTokens() {
			return this.bodyTokens;
		}
	}

	public static class ASTAtRule extends YWCSSToken {
		private final String name;
		private final YWCSSToken[] preludeTokens;
		private final YWCSSToken[] bodyTokens;

		public ASTAtRule(String name, YWCSSToken[] preludeTokens, YWCSSToken[] bodyTokens) {
			super(Type.AST_AT_RULE);
			this.name = name;
			this.preludeTokens = preludeTokens;
			this.bodyTokens = bodyTokens;
		}

		public String getName() {
			return this.name;
		}

		public YWCSSToken[] getPreludeTokens() {
			return this.preludeTokens;
		}

		public YWCSSToken[] getBodyTokens() {
			return this.bodyTokens;
		}
	}

	public static class ASTDeclaration extends YWCSSToken {
		private final String name;
		private final YWCSSToken[] valueTokens;
		private final boolean important;

		public ASTDeclaration(String name, YWCSSToken[] valueTokens, boolean important) {
			super(Type.AST_FUNCTION);
			this.name = name;
			this.valueTokens = valueTokens;
			this.important = important;
		}

		public String getName() {
			return this.name;
		}

		public YWCSSToken[] getValueTokens() {
			return this.valueTokens;
		}

		public boolean isImportant() {
			return this.important;
		}
	}

	public static class ASTSimpleBlock extends YWCSSToken {
		private final Type openTokenType;
		private final YWCSSToken[] tokens;

		public ASTSimpleBlock(Type openTokenType, YWCSSToken[] tokens) {
			super(Type.AST_SIMPLE_BLOCK);
			this.openTokenType = openTokenType;
			this.tokens = tokens;
		}

		public Type getOpenTokenType() {
			return this.openTokenType;
		}

		public YWCSSToken[] getTokens() {
			return this.tokens;
		}
	}

}
