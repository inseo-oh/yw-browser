package io.github.inseooh.yw.css.syntax;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.logging.Logger;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.css.YWCSSPropertyDescriptor;
import io.github.inseooh.yw.css.YWCSSPropertySet;
import io.github.inseooh.yw.css.om.YWCSSRule;
import io.github.inseooh.yw.css.om.YWCSSStyleDeclaration;
import io.github.inseooh.yw.css.om.YWCSSStyleSheet;
import io.github.inseooh.yw.css.selector.YWCSSComplexSelector;
import io.github.inseooh.yw.encoding.YWEncoding;
import io.github.inseooh.yw.encoding.YWIOQueue;

public class YWCSSParser {
	private static final Logger LOGGER = Logger.getLogger(YWCSSParser.class.getSimpleName());

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/css-syntax-3/#determine-the-fallback-encoding">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWEncoding determineFallbackEncoding(byte[] bytes) {
		/* S1 *************************************************************************/

		/* TODO */

		/* S2 *************************************************************************/
		int bytesLen = Math.min(1024, bytes.length);

		if (bytesLen < 10 || Arrays.equals(Arrays.copyOfRange(bytes, 0, 10),
				new byte[] { '@', 'c', 'h', 'a', 'r', 's', 'e', 't', '\"' })) {
			StringBuilder label = new StringBuilder();
			for (int i = 10; i < bytesLen; i++) {
				if (i + 2 <= bytesLen && bytes[i] == '\"' && bytes[i + 1] == ';') {
					break;
				}
				label.appendCodePoint(bytes[i]);
			}
			YWEncoding enc = YWEncoding.fromLabel(label.toString());
			if (enc == YWEncoding.UTF16_BE || enc == YWEncoding.UTF16_LE) {
				/* This is not a bug. The standard says to do this. */
				return YWEncoding.UTF8;
			} else if (enc != null) {
				return enc;
			}
		}

		/* S3 *************************************************************************/

		/* S4 *************************************************************************/
		return YWEncoding.UTF8;
	}

	/**
	 * @see <a href="https://www.w3.org/TR/css-syntax-3/#css-decode-bytes"> Relevant
	 *      section in CSS specification</a>
	 */
	private static String decodeBytes(byte[] bytes) {
		YWEncoding fallback = determineFallbackEncoding(bytes);
		YWIOQueue input = new YWIOQueue();
		for (byte aByte : bytes) {
			input.push(aByte);
		}
		YWIOQueue output = YWEncoding.decode(input, fallback);
		return output.itemsToString();
	}

	/**
	 * @see <a href="https://www.w3.org/TR/css-syntax-3/#css-filter-code-points">
	 *      Relevant section in CSS specification</a>
	 */
	private static String filterCodepoints(String in) {
		StringBuilder res = new StringBuilder();
		String remaining = in;
		while (!remaining.isEmpty()) {
			if (remaining.startsWith("\r\n")) {
				/* CR followed by LF */
				remaining = remaining.substring(2);
			} else if (remaining.startsWith("\r") || remaining.startsWith("\n")) {
				res.append("\n");
				remaining = remaining.substring(1);
			} else if (remaining.startsWith("" + (char) 0x00) || YWUtility.isSurrogateChar(remaining.codePointAt(0))) {
				res.append("\ufffd");
				remaining = remaining.substring(1);
			} else {
				res.append(remaining.charAt(0));
				remaining = remaining.substring(1);
			}
		}
		return res.toString();
	}

	/**
	 * @see <a href= "https://www.w3.org/TR/css-syntax-3/#parse-a-stylesheet">
	 *      Relevant section in CSS specification</a>
	 * @see {@link YWCSSParser#newStyleSheetInput}
	 */
	public interface StyleSheetInput {
		String decode();
	}

	public static StyleSheetInput newStyleSheetInput(byte[] input) {
		return () -> decodeBytes(input);
	}

	public static StyleSheetInput newStyleSheetInput(String input) {
		return () -> input;
	}

	/*
	 * NOTE: This stylesheet represents unparsed stylesheet. It's just a wrapper
	 * around token list for the most part.
	 */
	private static class StyleSheet {
		YWCSSToken[] value = new YWCSSToken[0];
		String location = null;
	}

	/**
	 * @see <a href= "https://www.w3.org/TR/css-syntax-3/#parse-a-stylesheet">
	 *      Relevant section in CSS specification</a>
	 */
	private static StyleSheet parseStyleSheet(StyleSheetInput sInput, String location) {
		/* S1 *************************************************************************/
		ParserInput pInput = newParserInput(sInput.decode());

		/* S2 *************************************************************************/
		YWCSSTokenStream input = new YWCSSTokenStream(pInput.normalizeIntoTokenStream());

		/* S3 *************************************************************************/
		StyleSheet stylesheet = new StyleSheet();
		stylesheet.location = location;

		/* S4 *************************************************************************/
		stylesheet.value = input.consumeListOfRules(true);

		/* S5 *************************************************************************/
		return stylesheet;
	}

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/css-syntax-3/#style-rule">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWCSSRule.StyleRule parseStyleRule(YWCSSToken.ASTQualifiedRule rule) throws YWSyntaxError {
		YWCSSComplexSelector[] selectors;
		YWCSSTokenStream ts = new YWCSSTokenStream(rule.getPreludeTokens());
		selectors = YWCSSComplexSelector.parseComplexSelectorList(ts);
		if (!ts.isEndOfTokens()) {
			throw new YWSyntaxError();
		}
		YWCSSToken[] styleBlockContents = parseStyleBlockContents(newParserInput(rule.getBodyTokens()));
		List<YWCSSStyleDeclaration> declarations = new ArrayList<>();
		for (YWCSSToken tk : styleBlockContents) {
			if (tk instanceof YWCSSToken.ASTDeclaration decl) {
				YWCSSPropertyDescriptor desc = YWCSSPropertySet.DESCRIPTORS
						.get(decl.getName().toLowerCase(Locale.ROOT));
				if (desc == null) {
					LOGGER.warning("Unrecognized property name " + decl.getName());
					continue;
				}
				Object value;
				try {
					value = desc.parse(new YWCSSTokenStream(decl.getValueTokens()));
				} catch (YWSyntaxError e) {
					LOGGER.warning("Illegal value for property" + decl.getName());
					e.printStackTrace();
					continue;
				}
				declarations.add(new YWCSSStyleDeclaration(null, value, decl.isImportant()));
			} else if (tk instanceof YWCSSToken.ASTAtRule) {
				continue;
			} else {
				LOGGER.warning("Unrecognized token " + tk + "encountered during style rule parsing");
			}
		}

		return new YWCSSRule.StyleRule(selectors, declarations.toArray(new YWCSSStyleDeclaration[0]), null);
	}

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/2021/CRD-css-syntax-3-20211224/#parse-a-style-blocks-contents">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWCSSToken[] parseStyleBlockContents(ParserInput pInput) {
		/* S1 *************************************************************************/
		YWCSSTokenStream input = new YWCSSTokenStream(pInput.normalizeIntoTokenStream());

		/* S2 *************************************************************************/
		return input.consumeStyleBlockContents();
	}

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/css-syntax-3/#parse-a-css-stylesheet">
	 *      Relevant section in CSS specification</a>
	 */
	public static YWCSSStyleSheet parseCSSStyleSheet(StyleSheetInput sInput, String location) {
		StyleSheet rawSheet = parseStyleSheet(sInput, location);

		YWCSSStyleSheet sheet = new YWCSSStyleSheet();
		sheet.setLocation(rawSheet.location);
		List<YWCSSRule.StyleRule> styleRules = new ArrayList<>();
		for (YWCSSToken token : rawSheet.value) {
			if (token instanceof YWCSSToken.ASTQualifiedRule qRule) {
				try {
					styleRules.add(parseStyleRule(qRule));
				} catch (YWSyntaxError e) {
					LOGGER.warning("Ignoring invalid qualified rule");
					e.printStackTrace();
				}

			}
		}

		return sheet;
	}

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/css-syntax-3/#normalize-into-a-token-stream">
	 *      Relevant section in CSS specification</a>
	 * @see {@link YWCSSParser#newParserInput}
	 */
	interface ParserInput {
		YWCSSToken[] normalizeIntoTokenStream();
	}

	static ParserInput newParserInput(YWCSSToken[] input) {
		return () -> input;
	}

	static ParserInput newParserInput(String input) {
		return () -> YWCSSTokenizer.tokenize(filterCodepoints(input));
	}

	/**
	 * @see <a href=
	 *      "https://www.w3.org/TR/css-syntax-3/#parse-a-list-of-component-values">
	 *      Relevant section in CSS specification</a>
	 */
	YWCSSToken[] parseListOfComponentValues(ParserInput pInput) {
		/* S1 *************************************************************************/
		YWCSSTokenStream input = new YWCSSTokenStream(pInput.normalizeIntoTokenStream());

		/* S2 *************************************************************************/
		List<YWCSSToken> res = new ArrayList<>();
		while (true) {
			YWCSSToken token = input.consumeComponentValue();
			if (token == null) {
				break;
			}
			res.add(token);
		}
		return res.toArray(new YWCSSToken[0]);
	}

}
