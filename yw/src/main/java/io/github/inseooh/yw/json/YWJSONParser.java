package io.github.inseooh.yw.json;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.YWTextReader;
import io.github.inseooh.yw.YWUtility;

public final class YWJSONParser {
    private final YWTextReader tr;

    private YWJSONParser(String src) {
        this.tr = new YWTextReader(src);
    }

    private void skipWhitespaces() {
        while (true) {
            switch (tr.getNextChar()) {
                case '\t':
                case '\n':
                case '\r':
                    tr.consumeChar();
                    break;
                default:
                    return;
            }
        }
    }

    private YWJSONValue.Num parseNumber() throws YWSyntaxError {
        StringBuilder numString = new StringBuilder();
        boolean isFloat = false;

        // Sign ========================================================================
        if (tr.getNextChar() == '-') {
            numString.append(tr.consumeChar());
        }

        // Integer part ================================================================
        // If we have 0, we cannot have any more digits
        if (tr.consumeChar() != '0') {
            numString.append(tr.getCurrentChar());
            while (!tr.isEnd()) {
                int tempChar = tr.getNextChar();
                if (!YWUtility.isAsciiDigit(tempChar)) {
                    break;
                }
                numString.append(tr.consumeChar());
            }
        } else {
            numString.append('0');
        }

        // Decimal point ===============================================================
        if (tr.getNextChar() == '.') {
            isFloat = true;
            numString.append(tr.consumeChar());
            // Fractional part =============================================================
            while (!tr.isEnd()) {
                int tempChar = tr.getNextChar();
                if (!YWUtility.isAsciiDigit(tempChar)) {
                    break;
                }
                numString.append(tr.consumeChar());
            }
        }

        // Exponent indicator ==========================================================
        if (tr.getNextChar() == 'e' || tr.getNextChar() == 'E') {
            isFloat = true;
            numString.append(tr.consumeChar());
            int digitCount = 0;

            // Exponent sign ===============================================================
            if (tr.getNextChar() == '+' || tr.getNextChar() == '-') {
                numString.append(tr.consumeChar());
            }

            // Exponent ====================================================================
            while (!tr.isEnd()) {
                int tempChar = tr.getNextChar();
                if (!YWUtility.isAsciiDigit(tempChar)) {
                    break;
                }
                numString.append(tr.consumeChar());
                digitCount++;
            }
            if (digitCount == 0) {
                throw new YWSyntaxError();
            }
        }

        if (isFloat) {
            return YWJSONValue.create(Float.parseFloat(numString.toString()));
        } else {
            return YWJSONValue.create(Integer.parseInt(numString.toString()));
        }
    }

    private YWJSONValue.Str parseString() throws YWSyntaxError {
        StringBuilder res = new StringBuilder();

        if (tr.getNextChar() == '\"') {
            tr.consumeChar();
        } else {
            throw new YWSyntaxError();
        }

        while (true) {
            int chr = tr.consumeChar();
            if (chr == -1) {
                throw new YWSyntaxError();
            } else if (chr == '"') {
                break;
            } else if (chr == '\\') {
                switch (tr.consumeChar()) {
                    case '\"':
                    case '\\':
                    case '/':
                        chr = tr.getCurrentChar();
                        break;
                    case 'b':
                        chr = '\b';
                        break;
                    case 'f':
                        chr = '\f';
                        break;
                    case 'n':
                        chr = '\n';
                        break;
                    case 'r':
                        chr = '\r';
                        break;
                    case 't':
                        chr = '\t';
                        break;
                    case 'u': {
                        chr = 0;
                        for (int i = 0; i < 4; i++) {
                            int digitChr = tr.consumeChar();
                            if (YWUtility.isAsciiDigit(digitChr)) {
                                chr = (chr * 16) + (digitChr - '0');
                            } else if (YWUtility.isAsciiUppercaseHexDigit(digitChr)) {
                                chr = (chr * 16) + (digitChr - 'A' + 10);
                            } else if (YWUtility.isAsciiLowercaseHexDigit(digitChr)) {
                                chr = (chr * 16) + (digitChr - 'A' + 10);
                            } else {
                                throw new YWSyntaxError();
                            }
                        }
                        break;
                    }
                    case -1:
                        throw new YWSyntaxError();
                }
            }
            res.appendCodePoint(chr);
        }
        return YWJSONValue.create(res.toString());
    }

    private YWJSONValue.Obj parseObject() throws YWSyntaxError {
        Map<String, YWJSONValue> res = new HashMap<>();

        if (tr.getNextChar() == '{') {
            tr.consumeChar();
        } else {
            throw new YWSyntaxError();
        }
        while (true) {
            skipWhitespaces();
            String entName = parseString().value();
            skipWhitespaces();
            if (tr.getNextChar() == ':') {
                tr.consumeChar();
            } else {
                throw new YWSyntaxError();
            }
            skipWhitespaces();
            YWJSONValue entValue = parseValue();
            skipWhitespaces();
            boolean hasMore = false;
            if (tr.getNextChar() == ',') {
                tr.consumeChar();
                hasMore = true;
            }
            res.put(entName, entValue);
            if (!hasMore) {
                break;
            }
        }
        if (tr.getNextChar() == '}') {
            tr.consumeChar();
        } else {
            throw new YWSyntaxError();
        }
        return YWJSONValue.create(res);
    }

    private YWJSONValue.Arr parseArray() throws YWSyntaxError {
        List<YWJSONValue> res = new ArrayList<>();

        if (tr.getNextChar() == '[') {
            tr.consumeChar();
        }
        while (true) {
            skipWhitespaces();
            YWJSONValue val = parseValue();
            skipWhitespaces();
            boolean hasMore = false;
            if (tr.getNextChar() == ',') {
                tr.consumeChar();
                hasMore = true;
            }
            res.add(val);
            if (!hasMore) {
                break;
            }
        }
        if (tr.getNextChar() == ']') {
            tr.consumeChar();
        }
        return YWJSONValue.create(res);
    }

    private YWJSONValue parseValue() throws YWSyntaxError {
        if (tr.getNextChar() == '{') {
            return parseObject();
        }
        if (tr.getNextChar() == '[') {
            return parseArray();
        }
        if ((tr.getNextChar() == '+') || (tr.getNextChar() == '-') || YWUtility.isAsciiDigit(tr.getNextChar())) {
            return parseNumber();
        }
        if (tr.getNextChar() == '\"') {
            return parseString();
        }
        if (tr.consumeString("true", YWTextReader.NO_MATCH_FLAGS)) {
            return YWJSONValue.create(true);
        }
        if (tr.consumeString("false", YWTextReader.NO_MATCH_FLAGS)) {
            return YWJSONValue.create(false);
        }
        if (tr.consumeString("null", YWTextReader.NO_MATCH_FLAGS)) {
            return new YWJSONValue.Null();
        }
        throw new YWSyntaxError();
    }

    public static YWJSONValue parse(String src) throws YWSyntaxError {
        YWJSONParser par = new YWJSONParser(src);
        par.skipWhitespaces();
        return par.parseValue();
    }
}
