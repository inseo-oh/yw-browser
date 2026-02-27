package io.github.inseooh.yw.css.syntax;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.encoding.YWEncoding;
import io.github.inseooh.yw.encoding.YWIOQueue;

public class YWCSSParser {

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
	 * @see {@link YWCSSParser#newStylesheetInput}
	 */
	interface StylesheetInput {
		String decode();
	}

    static StylesheetInput newStylesheetInput(byte[] input) {
		return () -> decodeBytes(input);
	}

	static StylesheetInput newStylesheetInput(String input) {
		return () -> input;
	}

	/*
	 * NOTE: This stylesheet represents unparsed stylesheet. It's just a wrapper
	 * around token list for the most part.
	 */
	private static class Stylesheet {
		YWCSSToken[] value = new YWCSSToken[0];
		String location = null;
	}

    /**
	 * @see <a href= "https://www.w3.org/TR/css-syntax-3/#parse-a-stylesheet">
	 *      Relevant section in CSS specification</a>
	 */
	private static Stylesheet parseStylesheet(StylesheetInput sInput, String location) {
		/* S1 *************************************************************************/
		ParserInput pInput = newParserInput(sInput.decode());

		/* S2 *************************************************************************/
		YWCSSTokenStream input = new YWCSSTokenStream(pInput.normalizeIntoTokenStream());

		/* S3 *************************************************************************/
		Stylesheet stylesheet = new Stylesheet();
		stylesheet.location = location;

		/* S4 *************************************************************************/
		stylesheet.value = input.consumeListOfRules(true);

		/* S5 *************************************************************************/
		return stylesheet;
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
