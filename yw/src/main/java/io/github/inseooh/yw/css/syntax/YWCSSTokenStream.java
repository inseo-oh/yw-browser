package io.github.inseooh.yw.css.syntax;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.YWSyntaxError;

public class YWCSSTokenStream {

	private int cursor = 0;
	private final YWCSSToken[] tokens;

	public YWCSSTokenStream(YWCSSToken[] tokens) {
		this.tokens = tokens;
	}

	public boolean isEndOfTokens() {
		return this.tokens.length <= this.cursor;
	}

	YWCSSToken expectAnyToken() {
		if (this.isEndOfTokens()) {
			return null;
		}
		this.cursor++;
		return this.tokens[this.cursor - 1];
	}

	public YWCSSToken expectToken(YWCSSToken.Type type) {
		int oldCursor = this.cursor;
		YWCSSToken tk = this.expectAnyToken();
		if (tk == null || tk.getType() != type) {
			this.cursor = oldCursor;
			return null;
		}
		return tk;
	}

	public  boolean expectDelim(int d) {
		int oldCursor = this.cursor;
		YWCSSToken.Delim token = (YWCSSToken.Delim) this.expectToken(YWCSSToken.Type.DELIM);
		if (token == null || token.getValue() != d) {
			this.cursor = oldCursor;
			return false;
		}
		return true;
	}

	public boolean expectIdent(String i) {
		int oldCursor = this.cursor;
		YWCSSToken.Ident token = (YWCSSToken.Ident) this.expectToken(YWCSSToken.Type.IDENT);
		if (token == null || !token.getValue().equals(i)) {
			this.cursor = oldCursor;
			return false;
		}
		return true;
	}

	public YWCSSToken.ASTSimpleBlock expectSimpleBlock(YWCSSToken.Type openTokenType) {
		int oldCursor = this.cursor;
		YWCSSToken.ASTSimpleBlock token = (YWCSSToken.ASTSimpleBlock) this
				.expectToken(YWCSSToken.Type.AST_SIMPLE_BLOCK);
		if (token == null || token.getOpenTokenType() != openTokenType) {
			this.cursor = oldCursor;
			return null;
		}
		return token;
	}

	public YWCSSToken.ASTFunction expectAstFunc(String f) {
		int oldCursor = this.cursor;
		YWCSSToken.ASTFunction token = (YWCSSToken.ASTFunction) this.expectToken(YWCSSToken.Type.AST_FUNCTION);
		if (token == null || !token.getName().equals(f)) {
			this.cursor = oldCursor;
			return null;
		}
		return token;
	}

	public void skipWhitespaces() {
		while (true) {
			int oldCursor = this.cursor;
			if (this.expectToken(YWCSSToken.Type.WHITESPACE) == null) {
				this.cursor = oldCursor;
				break;
			}
		}
	}

	private YWCSSToken consumePreservedToken() {
		int oldCursor = this.cursor;
		YWCSSToken token = this.expectAnyToken();
		if (token == null || token.getType() == YWCSSToken.Type.FUNCTION_KEYWORD
				|| token.getType() == YWCSSToken.Type.LEFT_CURLY_BRACKET
				|| token.getType() == YWCSSToken.Type.LEFT_SQUARE_BRACKET
				|| token.getType() == YWCSSToken.Type.LEFT_PAREN) {
			this.cursor = oldCursor;
			return null;
		}
		return token;
	}

	private YWCSSToken.ASTSimpleBlock consumeSimpleBlock(YWCSSToken.Type openTokenType) {
		int oldCursor = this.cursor;
		YWCSSToken.Type closeTokenType;
		List<YWCSSToken> res = new ArrayList<>();

		switch (openTokenType) {
		case LEFT_CURLY_BRACKET:
			closeTokenType = YWCSSToken.Type.RIGHT_CURLY_BRACKET;
			break;
		case LEFT_SQUARE_BRACKET:
			closeTokenType = YWCSSToken.Type.RIGHT_SQUARE_BRACKET;
			break;
		case LEFT_PAREN:
			closeTokenType = YWCSSToken.Type.RIGHT_PAREN;
			break;
		default:
			throw new RuntimeException("illegal open token type");
		}

		YWCSSToken openToken = this.expectToken(openTokenType);
		YWCSSToken closeToken = null;
		if (openToken == null) {
			this.cursor = oldCursor;
			return null;
		}
		while (true) {
			YWCSSToken tempTk = this.consumeComponentValue();
			if (tempTk == null) {
				break;
			}
			if (tempTk.getType() == closeTokenType) {
				closeToken = tempTk;
				break;
			}
			res.add(tempTk);
		}
		if (closeToken == null) {
			this.cursor = oldCursor;
			return null;
		}
		return new YWCSSToken.ASTSimpleBlock(openTokenType, res.toArray(new YWCSSToken[0]));
	}

	private YWCSSToken.ASTSimpleBlock consumeCurlyBlock() {
		return this.consumeSimpleBlock(YWCSSToken.Type.LEFT_CURLY_BRACKET);
	}

	private YWCSSToken.ASTSimpleBlock consumeSquareBlock() {
		return this.consumeSimpleBlock(YWCSSToken.Type.LEFT_SQUARE_BRACKET);
	}

	private YWCSSToken.ASTSimpleBlock consumeParenBlock() {
		return this.consumeSimpleBlock(YWCSSToken.Type.LEFT_PAREN);
	}

	private YWCSSToken.ASTFunction consumeFunction() {
		int oldCursor = this.cursor;
		List<YWCSSToken> res = new ArrayList<>();

		YWCSSToken.FunctionKeyword funcToken = (YWCSSToken.FunctionKeyword) this
				.expectToken(YWCSSToken.Type.FUNCTION_KEYWORD);
		YWCSSToken closeToken = null;
		if (funcToken == null) {
			this.cursor = oldCursor;
			return null;
		}
		while (true) {
			YWCSSToken tempTk = this.consumeComponentValue();
			if (tempTk == null) {
				break;
			}
			if (tempTk.getType() == YWCSSToken.Type.RIGHT_PAREN) {
				closeToken = tempTk;
				break;
			}
			res.add(tempTk);
		}
		if (closeToken == null) {
			this.cursor = oldCursor;
			return null;
		}
		return new YWCSSToken.ASTFunction(funcToken.getValue(), res.toArray(new YWCSSToken[0]));
	}

	YWCSSToken consumeComponentValue() {
		YWCSSToken token = this.consumeCurlyBlock();
		if (token != null) {
			return token;
		}
		token = this.consumeSquareBlock();
		if (token != null) {
			return token;
		}
		token = this.consumeParenBlock();
		if (token != null) {
			return token;
		}
		token = this.consumeFunction();
		if (token != null) {
			return token;
		}
		token = this.consumePreservedToken();
        return token;
    }

	private YWCSSToken.ASTQualifiedRule consumeQualifiedRule() {
		int oldCursor = this.cursor;
		List<YWCSSToken> preludeTokens = new ArrayList<>();

		while (true) {
			YWCSSToken.ASTSimpleBlock tempBlock = this.consumeCurlyBlock();
			if (tempBlock != null) {
				return new YWCSSToken.ASTQualifiedRule(preludeTokens.toArray(new YWCSSToken[0]), tempBlock.getTokens());
			}
			YWCSSToken tempPrelude = this.consumeComponentValue();
			if (tempPrelude == null) {
				this.cursor = oldCursor;
				return null;
			}
			preludeTokens.add(tempPrelude);
		}
	}

	private YWCSSToken.ASTAtRule consumeAtRule() {
		int oldCursor = this.cursor;
		List<YWCSSToken> preludeTokens = new ArrayList<>();
		YWCSSToken.AtKeyword kwdToken = (YWCSSToken.AtKeyword) this.expectToken(YWCSSToken.Type.AT_KEYWORD);

		while (true) {
			YWCSSToken.ASTSimpleBlock tempBlock = this.consumeCurlyBlock();
			if (tempBlock != null) {
				return new YWCSSToken.ASTAtRule(kwdToken.getValue(), preludeTokens.toArray(new YWCSSToken[0]),
						tempBlock.getTokens());
			}
			YWCSSToken tempPrelude = this.consumeComponentValue();
			if (tempPrelude == null) {
				this.cursor = oldCursor;
				return null;
			}
			preludeTokens.add(tempPrelude);
		}
	}

	private YWCSSToken.ASTDeclaration consumeDeclaration() {
		int oldCursor = this.cursor;
		List<YWCSSToken> declValues = new ArrayList<>();
		boolean declIsImportant = false;
		String declName;

		/* <name> : contents !important ****************************************/
		YWCSSToken.Ident tempIdentTk = (YWCSSToken.Ident) this.expectToken(YWCSSToken.Type.IDENT);
		if (tempIdentTk == null) {
			this.cursor = oldCursor;
			return null;
		}
		declName = tempIdentTk.getValue();

		/* name< >: contents !important ****************************************/
		this.skipWhitespaces();
		/* name <:> contents !important ****************************************/
		if (this.expectToken(YWCSSToken.Type.COLON) == null) {
			this.cursor = oldCursor;
			return null;
		}
		/* name :< >contents !important ****************************************/
		this.skipWhitespaces();
		/* name : <contents !important> ****************************************/
		while (true) {
			YWCSSToken tempTk = this.consumeComponentValue();
			if (tempTk == null) {
				break;
			}
			declValues.add(tempTk);
		}
		if (2 <= declValues.size()) {
			/* See if we have !important */
			YWCSSToken ptk1 = declValues.get(declValues.size() - 2);
			YWCSSToken ptk2 = declValues.get(declValues.size() - 1);
			if (ptk1.getType() == YWCSSToken.Type.DELIM && ((YWCSSToken.Delim) ptk1).getValue() == '!'
					&& ptk2.getType() == YWCSSToken.Type.IDENT
					&& ((YWCSSToken.Ident) ptk2).getValue().equals("important")) {
				declValues.remove(declValues.size() - 1);
				declValues.remove(declValues.size() - 1);
				declIsImportant = true;
			}
		}
		return new YWCSSToken.ASTDeclaration(declName, declValues.toArray(new YWCSSToken[0]), declIsImportant);
	}

	private YWCSSToken[] consumeDeclarationList() {
		int oldCursor = this.cursor;
		List<YWCSSToken> decls = new ArrayList<>();
		while (true) {
			int cursorBeforeToken = this.cursor;
			YWCSSToken token = this.expectAnyToken();
			if (token == null) {
				break;
			}
			if (token.getType() == YWCSSToken.Type.WHITESPACE) {
            } else if (token.getType() == YWCSSToken.Type.AT_KEYWORD) {
				this.cursor = cursorBeforeToken;
				YWCSSToken res = this.consumeAtRule();
				decls.add(res);
			} else if (token.getType() == YWCSSToken.Type.IDENT) {
				List<YWCSSToken> tokens = new ArrayList<>();
				tokens.add(token);

				while (true) {
					cursorBeforeToken = this.cursor;
					YWCSSToken tempToken = this.expectAnyToken();
					if (tempToken == null) {
						break;
					}
					if (tempToken.getType() == YWCSSToken.Type.SEMICOLON) {
						this.cursor = cursorBeforeToken;
						break;
					}
					tokens.add(tempToken);
				}
				YWCSSTokenStream innerTs = new YWCSSTokenStream(tokens.toArray(new YWCSSToken[0]));
				YWCSSToken decl = innerTs.consumeDeclaration();
				if (decl == null) {
					break;
				} else {
					decls.add(decl);
				}
			} else {
				/* PARSE ERROR */
				while (true) {
					cursorBeforeToken = this.cursor;
					YWCSSToken tempToken = this.expectAnyToken();
					if (tempToken == null) {
						break;
					}
					this.cursor = cursorBeforeToken;
					if (tempToken.getType() == YWCSSToken.Type.SEMICOLON) {
						break;
					}
					this.consumeComponentValue();
				}
			}
		}
		if (decls.isEmpty()) {
			this.cursor = oldCursor;
			return null;
		}
		return decls.toArray(new YWCSSToken[0]);
	}

	private YWCSSToken[] consumeStyleBlockContents() {
		int oldCursor = this.cursor;
		List<YWCSSToken> decls = new ArrayList<>();
		List<YWCSSToken> rules = new ArrayList<>();

		while (true) {
			int cursorBeforeToken = this.cursor;
			YWCSSToken token = this.expectAnyToken();
			if (token == null) {
				break;
			}
			if (token.getType() == YWCSSToken.Type.WHITESPACE) {
            } else if (token.getType() == YWCSSToken.Type.AT_KEYWORD) {
				this.cursor = cursorBeforeToken;
				YWCSSToken res = this.consumeAtRule();
				decls.add(res);
			} else if (token.getType() == YWCSSToken.Type.IDENT) {
				List<YWCSSToken> tokens = new ArrayList<>();
				tokens.add(token);

				while (true) {
					cursorBeforeToken = this.cursor;
					YWCSSToken tempToken = this.expectAnyToken();
					if (tempToken == null) {
						break;
					}
					if (tempToken.getType() == YWCSSToken.Type.SEMICOLON) {
						this.cursor = cursorBeforeToken;
						break;
					}
					tokens.add(tempToken);
				}
				YWCSSTokenStream innerTs = new YWCSSTokenStream(tokens.toArray(new YWCSSToken[0]));
				YWCSSToken decl = innerTs.consumeDeclaration();
				if (decl == null) {
					break;
				} else {
					decls.add(decl);
				}
			} else if (token.getType() == YWCSSToken.Type.DELIM && ((YWCSSToken.Delim) token).getValue() == '&') {
				this.cursor = oldCursor;
				YWCSSToken.ASTQualifiedRule res = this.consumeQualifiedRule();
				if (res != null) {
					rules.add(res);
				}
			} else {
				/* PARSE ERROR */
				while (true) {
					cursorBeforeToken = this.cursor;
					YWCSSToken tempToken = this.expectAnyToken();
					if (tempToken == null) {
						break;
					}
					this.cursor = cursorBeforeToken;
					if (tempToken.getType() == YWCSSToken.Type.SEMICOLON) {
						break;
					}
					this.consumeComponentValue();
				}
			}
		}
        decls.addAll(rules);
		if (decls.isEmpty()) {
			this.cursor = oldCursor;
			return null;
		}
		return decls.toArray(new YWCSSToken[0]);
	}

	YWCSSToken[] consumeListOfRules(boolean topLevel) {
		List<YWCSSToken> rules = new ArrayList<>();

		while (true) {
			int cursorBeforeToken = this.cursor;
			YWCSSToken token = this.expectAnyToken();
			if (token == null) {
				break;
			}
			if (token.getType() == YWCSSToken.Type.WHITESPACE) {
            } else if (token.getType() == YWCSSToken.Type.CDO || token.getType() == YWCSSToken.Type.CDC) {
				if (topLevel) {
					continue;
				}
				this.cursor = cursorBeforeToken;
				YWCSSToken res = this.consumeQualifiedRule();
				if (res != null) {
					rules.add(res);
				}
			} else if (token.getType() == YWCSSToken.Type.AT_KEYWORD) {
				this.cursor = cursorBeforeToken;
				YWCSSToken res = this.consumeAtRule();
				rules.add(res);
			} else {
				YWCSSToken res = this.consumeQualifiedRule();
				if (res != null) {
					rules.add(res);
				} else {
					break;
				}
			}
		}
		return rules.toArray(new YWCSSToken[0]);
	}

	private YWCSSToken[] consumeDeclarationValueImpl(boolean isAnyValue) {
		/*
		 * https://www.w3.org/TR/css-syntax-3/#typedef-declaration-value
		 */
		int oldCursor = this.cursor;
		List<YWCSSToken> res = new ArrayList<>();
		List<YWCSSToken.Type> openBlockTokens = new ArrayList<>();

		while (true) {
			int cursorBeforeToken = this.cursor;
			YWCSSToken token = this.expectAnyToken();
			if (token == null) {
				break;
			}
			if (token.getType() == YWCSSToken.Type.BAD_STRING || token.getType() == YWCSSToken.Type.BAD_URL ||
			/*
			 * https://www.w3.org/TR/css-syntax-3/#typedef-any-value
			 */
					(!isAnyValue && (token.getType() == YWCSSToken.Type.SEMICOLON
							|| (token.getType() == YWCSSToken.Type.DELIM
									&& ((YWCSSToken.Delim) token).getValue() == '!')))) {
				this.cursor = cursorBeforeToken;
				break;
			}
			/* If we have block opening token, push it to the stack. */
			if (token.getType() == YWCSSToken.Type.LEFT_PAREN || token.getType() == YWCSSToken.Type.LEFT_SQUARE_BRACKET
					|| token.getType() == YWCSSToken.Type.LEFT_CURLY_BRACKET) {
				openBlockTokens.add(token.getType());
			}
			/* If we have block closing token, see if we have unmatched token. */
			else if (token.getType() == YWCSSToken.Type.RIGHT_PAREN
					|| token.getType() == YWCSSToken.Type.RIGHT_SQUARE_BRACKET
					|| token.getType() == YWCSSToken.Type.RIGHT_CURLY_BRACKET) {
				if (openBlockTokens.isEmpty()) {
					break;
				}
				YWCSSToken.Type last = openBlockTokens.get(openBlockTokens.size() - 1);
				if ((token.getType() == YWCSSToken.Type.RIGHT_PAREN && last != YWCSSToken.Type.LEFT_PAREN)
						|| (token.getType() == YWCSSToken.Type.RIGHT_SQUARE_BRACKET
								&& last != YWCSSToken.Type.LEFT_SQUARE_BRACKET)
						|| (token.getType() == YWCSSToken.Type.RIGHT_CURLY_BRACKET
								&& last != YWCSSToken.Type.LEFT_CURLY_BRACKET)) {
					break;
				}
			}
			res.add(token);
		}
		if (res.isEmpty()) {
			this.cursor = oldCursor;
			return null;
		}
		return res.toArray(new YWCSSToken[0]);
	}

	YWCSSToken[] consumeDeclarationValue() {
		return this.consumeDeclarationValueImpl(false);
	}

	YWCSSToken[] consumeAnyValue() {
		return this.consumeDeclarationValueImpl(true);
	}

	public static final int NO_MAX_REPEATS = 0;

	/**
	 * @apiNote Pass {@link YWCSSTokenStream#NO_MAX_REPEATS} if you don't want
	 *          arbitrary limit.
	 * @see <a href="https://www.w3.org/TR/css-values-4/#mult-comma">Relevant
	 *      section in CSS specification</a>
	 */
	public <T> T[] parseCommaSeparatedRepeation(T[] destArray, int maxRepeats, YWCSSParse<T> parser) throws YWSyntaxError {
		List<T> res = new ArrayList<>();
		int lastCursorAfterValue = 0;
		while (true) {
			T token = parser.parse();
			if (token == null) {
				if (!res.isEmpty()) {
					throw new YWSyntaxError();
				}
				break;
			}
			res.add(token);
			if (maxRepeats != NO_MAX_REPEATS && maxRepeats <= res.size()) {
				break;
			}
			this.skipWhitespaces();
			lastCursorAfterValue = this.cursor;
			if (this.expectToken(YWCSSToken.Type.COMMA) == null) {
				break;
			}
			this.skipWhitespaces();
		}
		return res.toArray(destArray);
	}

	/**
	 * @throws YWSyntaxError 
	 * @see <a href="https://www.w3.org/TR/css-values-4/#mult-comma">Relevant
	 *      section in CSS specification</a>
	 */
	public <T> T[] parseCommaSeparatedRepeation(T[] destArray, YWCSSParse<T> parser) throws YWSyntaxError {
		return this.parseCommaSeparatedRepeation(destArray, NO_MAX_REPEATS, parser);
	}

	/**
	 * @throws YWSyntaxError 
	 * @apiNote Pass {@link YWCSSTokenStream#NO_MAX_REPEATS} if you don't want
	 *          arbitrary limit.
	 * @see <a href="https://www.w3.org/TR/-values-4/#mult-num-range">Relevant
	 *      section in CSS specification</a>
	 */
	public <T> T[] parseRepeation(T[] destArray, int maxRepeats, YWCSSParse<T> parser) throws YWSyntaxError {
		List<T> res = new ArrayList<>();
		while (true) {
			T token = parser.parse();
			if (token == null) {
				break;
			}
			res.add(token);
			if (maxRepeats != NO_MAX_REPEATS && maxRepeats <= res.size()) {
				break;
			}
			this.skipWhitespaces();
		}
		return res.toArray(destArray);
	}

	/**
	 * @throws YWSyntaxError 
	 * @see <a href="https://www.w3.org/TR/-values-4/#mult-num-range">Relevant
	 *      section in CSS specification</a>
	 */
	public <T> T[] parseRepeation(T[] destArray, YWCSSParse<T> parser) throws YWSyntaxError {
		return this.parseRepeation(destArray, NO_MAX_REPEATS, parser);
	}

	public int getCursor() {
		return this.cursor;
	}
	public void setCursor(int cursor) {
		this.cursor = cursor;
	}

}
