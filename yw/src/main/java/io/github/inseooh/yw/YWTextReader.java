package io.github.inseooh.yw;

public class YWTextReader {
    private final String str;
    private int cursor = 0;

    public YWTextReader(String s) {
        this.str = s;
    }

    public int getCursor() {
        return this.cursor;
    }

    public void setCursor(int cursor) {
        this.cursor = cursor;
    }

    public boolean isEnd() {
        return this.str.length() <= this.cursor;
    }

    /* Returns -1 if there are no more characters */
    public int getNextChar(int offset) {
        if (this.str.length() <= this.cursor + offset) {
            return -1;
        }
        int c = this.str.codePointAt(this.cursor + offset);
        if (0x80 <= c) {
            /* TODO: Handle unicode characters */
            throw new RuntimeException("TODO");
        }
        return c;
    }

    public int getNextChar() {
        return this.getNextChar(0);
    }


    public int getCurrentChar() {
        if (this.cursor == 0) {
            throw new RuntimeException("must be called after consuming something");
        }
        int c = this.str.codePointAt(this.cursor - 1);
        if (0x80 <= c) {
            /* TODO: Handle unicode characters */
            throw new RuntimeException("TODO");
        }
        return c;
    }

    public void reconsumeChar() {
        if (this.cursor == 0) {
            throw new RuntimeException("must be called after consuming something");
        }
        int c = this.str.codePointAt(this.cursor - 1);
        if (0x80 <= c) {
            /* TODO: Handle unicode characters */
            throw new RuntimeException("TODO");
        } else {
            this.cursor--;
        }
    }

    public interface Tester {
        boolean test(String s);
    }

    public boolean test(Tester tester) {
        return tester.test(this.str.substring(this.cursor));
    }

    public boolean startsWith(final String prefix) {
        return this.test(s -> s.startsWith(prefix));
    }

    public String consumeChars(int maxCount) {
        int startIdx = this.cursor;
        int len = 0;
        while (len < maxCount) {
            int cp = this.getNextChar();
            if (cp == -1) {
                break;
            } else if (0x80 <= cp) {
                /* TODO: Handle unicode characters */
                throw new RuntimeException("TODO");
            } else {
                this.cursor++;
                len++;
            }
        }
        int endIdx = this.cursor + len;
        return this.str.substring(startIdx, endIdx);
    }

    /* Returns -1 if there are no more characters */
    public int consumeChar() {
        String s = this.consumeChars(1);
        if (s.isEmpty()) {
            return -1;
        }
        return s.codePointAt(0);
    }

    public static final int NO_MATCH_FLAGS = 0;
    public static final int ASCII_CASE_INSENSITIVE = 1;

    public boolean consumeString(String str, int matchFlags) {
        if ((this.str.length() - this.cursor) < str.length()) {
            return false;
        }
        for (int i = 0; i < str.length(); i++) {
            int srcChr = str.codePointAt(i);
            int gotChr = this.str.codePointAt(this.cursor + i);
            if ((matchFlags & YWTextReader.ASCII_CASE_INSENSITIVE) != 0) {
                srcChr = YWUtility.toAsciiLowercase(srcChr);
                gotChr = YWUtility.toAsciiLowercase(gotChr);
            }
            if (srcChr != gotChr) {
                return false;
            }
        }
        this.cursor += str.length();
        return true;
    }

}
