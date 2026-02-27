package io.github.inseooh.yw.css.syntax;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.YWTextReader;
import io.github.inseooh.yw.YWUtility;

public class YWCSSTokenizer {
    private final YWTextReader tr;

    private YWCSSTokenizer(String text) {
        this.tr = new YWTextReader(text);
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#digit">Relevant section in
     * CSS specification</a>
     */
    private static boolean isDigit(int codePoint) {
        return '0' <= codePoint && codePoint <= '9';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#hex-digit">Relevant section
     * in CSS specification</a>
     */
    private static boolean isHexDigit(int codePoint) {
        return isDigit(codePoint) || ('a' <= codePoint && codePoint <= 'f') || ('A' <= codePoint && codePoint <= 'F');
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#uppercase-letter">Relevant
     * section in CSS specification</a>
     */
    private static boolean isUppercaseLetter(int codePoint) {
        return 'A' <= codePoint && codePoint <= 'Z';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#lowercase-letter">Relevant
     * section in CSS specification</a>
     */
    private static boolean isLowercaseLetter(int codePoint) {
        return 'a' <= codePoint && codePoint <= 'z';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#letter">Relevant section in
     * CSS specification</a>
     */
    private static boolean isLetter(int codePoint) {
        return isUppercaseLetter(codePoint) || isLowercaseLetter(codePoint);
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#non-ascii-code-point">Relevant
     * section in CSS specification</a>
     */
    private static boolean isNonAsciiCodePoint(int codePoint) {
        return 0x80 <= codePoint;
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#ident-start-code-point">Relevant
     * section in CSS specification</a>
     */
    private static boolean isIdentStartCodePoint(int c) {
        return isLetter(c) || isNonAsciiCodePoint(c) || c == '_';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#ident-code-point">Relevant
     * section in CSS specification</a>
     */
    private static boolean isIdentCodePoint(int c) {
        return isIdentStartCodePoint(c) || isDigit(c) || c == '-';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#whitespace">Relevant
     * section in CSS specification</a>
     */
    private static boolean isNewline(int codePoint) {
        return codePoint == '\n';
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#whitespace">Relevant
     * section in CSS specification</a>
     */
    private static boolean isWhitespace(int codePoint) {
        return isNewline(codePoint) || codePoint == ' ' || codePoint == '\t';
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#non-printable-code-point">Relevant
     * section in CSS specification</a>
     */
    private static boolean isNonPrintableCodePoint(int codePoint) {
        return (0x0000 <= codePoint && codePoint <= 0x0008) || codePoint == 0x000b
                || (0x000e <= codePoint && codePoint <= 0x001f) || codePoint == 0x007f;
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-token">Relevant
     * section in CSS specification</a>
     */
    public YWCSSToken consumeToken() {
        this.consumeComments();
        while (true) {
            int cp = this.tr.consumeChar();
            if (isWhitespace(cp)) {
                this.consumeWhitespaces();
                return new YWCSSToken(YWCSSToken.Type.WHITESPACE);
            } else if (cp == '\"') {
                return this.consumeStringToken(cp);
            } else if (cp == '#') {
                if (isIdentCodePoint(this.tr.getNextChar()) || this.startsWithValidEscape()) {
                    /* S1 *************************************************************************/
                    String value = "";
                    YWCSSToken.Hash.HashType type = YWCSSToken.Hash.HashType.UNRESTRICTED;

                    /* S2 *************************************************************************/
                    if (this.startsWithIdentSequence()) {
                        type = YWCSSToken.Hash.HashType.ID;
                    }

                    /* S3 *************************************************************************/
                    value = this.consumeIdentSequence();

                    /* S4 *************************************************************************/
                    YWCSSToken.Hash token = new YWCSSToken.Hash("", YWCSSToken.Hash.HashType.UNRESTRICTED);
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == '\'') {
                return this.consumeStringToken(cp);
            } else if (cp == '(') {
                return new YWCSSToken(YWCSSToken.Type.LEFT_PAREN);
            } else if (cp == ')') {
                return new YWCSSToken(YWCSSToken.Type.RIGHT_PAREN);
            } else if (cp == '+') {
                if (this.startsWithNumber()) {
                    this.tr.reconsumeChar();
                    return this.consumeNumericToken();
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == ',') {
                return new YWCSSToken(YWCSSToken.Type.COMMA);
            } else if (cp == '-') {
                if (this.startsWithNumber()) {
                    this.tr.reconsumeChar();
                    return this.consumeNumericToken();
                } else if (this.tr.startsWith("->")) {
                    return new YWCSSToken(YWCSSToken.Type.CDC);
                } else if (this.startsWithIdentSequence()) {
                    this.tr.reconsumeChar();
                    return this.consumeIdentLikeToken();
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == '.') {
                if (this.startsWithNumber()) {
                    this.tr.reconsumeChar();
                    return this.consumeNumericToken();
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == ':') {
                return new YWCSSToken(YWCSSToken.Type.COLON);
            } else if (cp == ';') {
                return new YWCSSToken(YWCSSToken.Type.SEMICOLON);
            } else if (cp == '<') {
                if (this.tr.startsWith("!--")) {
                    return new YWCSSToken(YWCSSToken.Type.CDO);
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == '@') {
                if (this.startsWithIdentSequence()) {
                    String value = this.consumeIdentSequence();
                    return new YWCSSToken.AtKeyword(value);
                } else {
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == '[') {
                return new YWCSSToken(YWCSSToken.Type.LEFT_SQUARE_BRACKET);
            } else if (cp == '\\') {
                if (this.startsWithValidEscape()) {
                    this.tr.reconsumeChar();
                    return this.consumeIdentLikeToken();
                } else {
                    /* PARSE ERROR */
                    return new YWCSSToken.Delim(this.tr.getCurrentChar());
                }
            } else if (cp == ']') {
                return new YWCSSToken(YWCSSToken.Type.RIGHT_SQUARE_BRACKET);
            } else if (cp == '{') {
                return new YWCSSToken(YWCSSToken.Type.LEFT_CURLY_BRACKET);
            } else if (cp == '}') {
                return new YWCSSToken(YWCSSToken.Type.RIGHT_CURLY_BRACKET);
            } else if (isDigit(cp)) {
                this.tr.reconsumeChar();
                return this.consumeNumericToken();
            } else if (isIdentStartCodePoint(cp)) {
                this.tr.reconsumeChar();
                return this.consumeIdentLikeToken();
            } else if (cp == -1) {
                return null;
            } else {
                return new YWCSSToken.Delim(this.tr.getCurrentChar());
            }

        }
    }

    private void consumeWhitespaces() {
        while (!this.tr.isEnd()) {
            if (!isWhitespace(this.tr.getNextChar())) {
                break;
            }
        }
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-comments">Relevant
     * section in CSS specification</a>
     */
    private void consumeComments() {
        boolean endFound = false;
        while (this.tr.isEnd()) {
            if (!this.tr.consumeString("/*", YWTextReader.NO_MATCH_FLAGS)) {
                return;
            }
            while (!this.tr.isEnd()) {
                if (this.tr.consumeString("*/", YWTextReader.NO_MATCH_FLAGS)) {
                    endFound = true;
                    break;
                }
                this.tr.consumeChar();
            }
            if (endFound) {
                continue;
            }
            /* PARSE ERROR: Reached EOF without closing the comment. */
            return;
        }
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-a-numeric-token">
     * Relevant section in CSS specification</a>
     */
    private YWCSSToken consumeNumericToken() {
        ConsumedNumber num = this.consumeNumber();
        if (this.startsWithIdentSequence()) {
            /* S1 *************************************************************************/
            float value = num.value;
            YWCSSToken.NumType numType = num.type;
            String unit = "";

            /* S2 *************************************************************************/
            unit = this.consumeIdentSequence();

            /* S3 *************************************************************************/
            return new YWCSSToken.Dimension(value, numType, unit);
        } else if (this.tr.getNextChar() == '%') {
            this.tr.consumeChar();
            return new YWCSSToken.Percentage(num.value, num.type);
        } else {
            return new YWCSSToken.Number(num.value, num.type);
        }
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#consume-an-ident-like-token">
     * Relevant section in CSS specification</a>
     */
    private YWCSSToken consumeIdentLikeToken() {
        String string = this.consumeIdentSequence();

        if (YWUtility.stringEqIgnoreAsciiCase(string, "url") && this.tr.getNextChar() == '(') {
            do {
                this.tr.consumeChar();
            } while (isWhitespace(this.tr.getNextChar()) && isWhitespace(this.tr.getNextChar(1)));
            if (this.tr.getNextChar() == '\"' || this.tr.getNextChar() == '\'' || (isWhitespace(this.tr.getNextChar())
                    && (this.tr.getNextChar(1) == '\"' || this.tr.getNextChar(1) == '\''))) {
                return new YWCSSToken.FunctionKeyword(string);
            } else {
                return this.consumeUrlToken();
            }
        } else if (this.tr.getNextChar() == '(') {
            this.tr.consumeChar();
            return new YWCSSToken.FunctionKeyword(string);
        }
        return new YWCSSToken.Ident(string);
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-a-string-token">
     * Relevant section in CSS specification</a>
     */
    private YWCSSToken consumeStringToken(int endingCodePoint) {
        StringBuilder result = new StringBuilder();
        while (!this.tr.isEnd()) {
            int cp = this.tr.consumeChar();
            if (cp == endingCodePoint) {
                break;
            } else if (cp == -1) {
                /* PARSE ERROR: Unexpected EOF */
                break;
            } else if (isNewline(cp)) {
                /* PARSE ERROR: Unexpected newline */
                this.tr.reconsumeChar();
                return new YWCSSToken(YWCSSToken.Type.BAD_STRING);
            } else if (cp == '\\') {
                if (this.tr.getNextChar() == -1) {
                } else if (isNewline(this.tr.getNextChar())) {
                    this.tr.consumeChar();
                } else {
                    result.appendCodePoint(this.consumeEscapedCodePoint());
                }
            } else {
                result.appendCodePoint(cp);
            }
        }
        return new YWCSSToken.Str(result.toString());
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-url-token">
     * Relevant section in CSS specification</a>
     */
    private YWCSSToken consumeUrlToken() {
        /* S1 *************************************************************************/
        StringBuilder value = new StringBuilder();

        /* S2 *************************************************************************/
        this.consumeWhitespaces();

        /* S3 *************************************************************************/
        while (true) {
            int cp = this.tr.consumeChar();
            if (cp == ')') {
                return new YWCSSToken.Url(value.toString());
            } else if (cp == -1) {
                /* PARSE ERROR: Unexpected EOF */
                return new YWCSSToken.Url(value.toString());
            } else if (isWhitespace(cp)) {
                this.consumeWhitespaces();
                if (this.tr.getNextChar() == ')' || this.tr.getNextChar() == -1) {
                    /* NOTE: If it was EOF(-1), this is a PARSE ERROR */
                    this.tr.consumeChar();
                    return new YWCSSToken.Url(value.toString());
                } else {
                    this.consumeRemnantsOfBadUrl();
                    return new YWCSSToken(YWCSSToken.Type.BAD_URL);
                }
            }
            if (cp == '\"' || cp == '\'' || cp == '(' || isNonPrintableCodePoint(cp)) {
                this.consumeRemnantsOfBadUrl();
                return new YWCSSToken(YWCSSToken.Type.BAD_URL);
            } else if (cp == '\\') {
                if (this.startsWithValidEscape()) {
                    value.appendCodePoint(this.consumeEscapedCodePoint());
                } else {
                    this.consumeRemnantsOfBadUrl();
                    return new YWCSSToken(YWCSSToken.Type.BAD_URL);
                }
            }
        }
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#consume-an-escaped-code-point">
     * Relevant section in CSS specification</a>
     */
    private int consumeEscapedCodePoint() {
        this.tr.consumeChar();
        boolean is_hex_digit = false;
        int hex_digit_val = 0;
        int hex_digit_count = 0;

        if (this.tr.isEnd()) {
            /* PARSE ERROR: Unexpected EOF */
            return 0xfffd;
        }
        while ((!this.tr.isEnd()) && hex_digit_count < 6) {
            int temp_char = this.tr.getNextChar();
            int digit = 0;
            if (isHexDigit(temp_char) && isDigit(temp_char)) {
                digit = temp_char - '0';
            } else if (isHexDigit(temp_char) && Character.isLowerCase(temp_char)) {
                digit = temp_char - 'a' + 10;
            } else if (isHexDigit(temp_char) && Character.isUpperCase(temp_char)) {
                digit = temp_char - 'A' + 10;
            } else {
                break;
            }
            this.tr.consumeChar();
            hex_digit_val = hex_digit_val * 16 + digit;
            is_hex_digit = true;
            hex_digit_count++;
        }
        if (is_hex_digit) {
            return hex_digit_val;
        } else {
            return this.tr.consumeChar();
        }
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#check-if-two-code-points-are-a-valid-escape">
     * Relevant section in CSS specification</a>
     */
    private static boolean twoCodePointsAreValidEscape(String s) {
        if (s.isEmpty() || s.charAt(0) != '\\') {
            return false;
        }
        return 2 > s.length() || !isNewline(s.charAt(1));
    }

    private boolean startsWithValidEscape() {
        int oldCursor = this.tr.getCursor();
        String s = this.tr.consumeChars(2);
        this.tr.setCursor(oldCursor);
        return twoCodePointsAreValidEscape(s);
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence">
     * Relevant section in CSS specification</a>
     */
    private static boolean threeCodePointsWouldStartIdentSequence(String s) {
        if (!s.isEmpty() && s.codePointAt(0) == '-') {
            return (2 <= s.length() && isIdentCodePoint(s.codePointAt(1)) || s.codePointAt(1) == '-')
                    || (3 <= s.length() && twoCodePointsAreValidEscape(s.substring(1)));
        } else if (!s.isEmpty() && isIdentStartCodePoint(s.codePointAt(0))) {
            return true;
        } else if (!s.isEmpty() && s.codePointAt(0) == '\\') {
            return twoCodePointsAreValidEscape(s);
        }
        return false;
    }

    private boolean startsWithIdentSequence() {
        int oldCursor = this.tr.getCursor();
        String s = this.tr.consumeChars(3);
        this.tr.setCursor(oldCursor);
        return threeCodePointsWouldStartIdentSequence(s);
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-a-number">
     * Relevant section in CSS specification</a>
     */
    private static boolean threeCodePointsWouldStartNumber(String s) {
        if (!s.isEmpty() && (s.codePointAt(0) == '+' || s.codePointAt(0) == '-')) {
            return (2 <= s.length() && isDigit(s.codePointAt(1)))
                    || (3 <= s.length() && s.codePointAt(1) == '.' && isDigit(s.codePointAt(2)));
        } else if (!s.isEmpty() && s.codePointAt(0) == '.') {
            return 2 <= s.length() && isDigit(s.codePointAt(1));
        } else {
            return !s.isEmpty() && isDigit(s.codePointAt(0));
        }
    }

    private boolean startsWithNumber() {
        int oldCursor = this.tr.getCursor();
        String s = this.tr.consumeChars(3);
        this.tr.setCursor(oldCursor);
        return threeCodePointsWouldStartNumber(s);
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#consume-an-ident-sequence">
     * Relevant section in CSS specification</a>
     */
    private String consumeIdentSequence() {
        StringBuilder result = new StringBuilder();
        while (true) {
            int cp = this.tr.consumeChar();
            if (isIdentCodePoint(cp)) {
                result.appendCodePoint(cp);
            } else if (this.startsWithValidEscape()) {
                result.appendCodePoint(this.consumeEscapedCodePoint());
            } else {
                this.tr.reconsumeChar();
                return result.toString();
            }
        }
    }

    private static class ConsumedNumber {
        float value;
        YWCSSToken.NumType type;
    }

    /**
     * @see <a href="https://www.w3.org/TR/css-syntax-3/#consume-a-number">Relevant
     * section in CSS specification</a>
     */
    private ConsumedNumber consumeNumber() {
        /* S1 *************************************************************************/
        YWCSSToken.NumType type = YWCSSToken.NumType.INTEGER;
        StringBuilder repr = new StringBuilder();

        /* S2 *************************************************************************/
        if (this.tr.getNextChar() == '+' || this.tr.getNextChar() == '-') {
            repr.appendCodePoint(this.tr.consumeChar());
        }

        /* S3 *************************************************************************/
        while (isDigit(this.tr.getNextChar())) {
            repr.appendCodePoint(this.tr.consumeChar());
        }

        /* S4 *************************************************************************/
        if (this.tr.getNextChar() == '.' && isDigit(this.tr.getNextChar(1))) {
            /* S4.1 ***********************************************************************/
            String chars = this.tr.consumeChars(2);

            /* S4.2 ***********************************************************************/
            repr.append(chars);

            /* S4.3 ***********************************************************************/
            type = YWCSSToken.NumType.NUMBER;

            /* S4.4 ***********************************************************************/
            while (isDigit(this.tr.getNextChar())) {
                repr.appendCodePoint(this.tr.consumeChar());
            }
        }

        /* S5 *************************************************************************/
        if ((this.tr.getNextChar() == 'e' || this.tr.getNextChar() == 'E')
                && (((this.tr.getNextChar(1) == '+' || this.tr.getNextChar() == '-') && isDigit(this.tr.getNextChar(2)))
                || isDigit(this.tr.getNextChar(1)))) {
            boolean areTwoChars = isDigit(this.tr.getNextChar(1));
            String chars;

            /* S5.1 ***********************************************************************/
            if (areTwoChars) {
                chars = this.tr.consumeChars(2);
            } else {
                chars = this.tr.consumeChars(3);
            }

            /* S5.2 ***********************************************************************/
            repr.append(chars);

            /* S5.3 ***********************************************************************/
            type = YWCSSToken.NumType.NUMBER;

            /* S5.4 ***********************************************************************/
            while (isDigit(this.tr.getNextChar())) {
                repr.appendCodePoint(this.tr.consumeChar());
            }
        }

        /* S6 *************************************************************************/
        float value = Float.parseFloat(repr.toString());

        /* S7 *************************************************************************/
        ConsumedNumber num = new ConsumedNumber();
        num.value = value;
        num.type = type;
        return num;
    }

    /**
     * @see <a href=
     * "https://www.w3.org/TR/css-syntax-3/#consume-the-remnants-of-a-bad-url">
     * Relevant section in CSS specification</a>
     */
    private void consumeRemnantsOfBadUrl() {
        while (true) {
            int cp = this.tr.consumeChar();
            if (cp == ')' || cp == -1) {
                return;
            } else if (this.startsWithValidEscape()) {
                this.consumeEscapedCodePoint();
            }
        }
    }

    /**
     * @see <a href= "https://www.w3.org/TR/css-syntax-3/#css-tokenize">Relevant
     * section in CSS specification</a>
     */
    static YWCSSToken[] tokenize(String input) {
        List<YWCSSToken> result = new ArrayList<>();
        YWCSSTokenizer tkr = new YWCSSTokenizer(input);
        while (true) {
            YWCSSToken tk = tkr.consumeToken();
            if (tk == null) {
                break;
            }
            result.add(tk);
        }
        return result.toArray(new YWCSSToken[0]);
    }
}
