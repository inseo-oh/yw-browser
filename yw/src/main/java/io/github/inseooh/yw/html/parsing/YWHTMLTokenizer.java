package io.github.inseooh.yw.html.parsing;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.logging.Logger;

import io.github.inseooh.yw.YWTextReader;
import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.dom.YWAttr;

public final class YWHTMLTokenizer {
    private static final Logger logger = Logger.getLogger(YWHTMLTokenizer.class.getSimpleName());
    private String lastStartTagName = null;
    private YWHTMLToken currentToken = null;
    private State state = State.DATA;
    private State returnState = null;
    private StringBuilder tempBuf = new StringBuilder();
    private int characterReferenceCode = 0;
    private boolean parserPauseFlag = false;
    private boolean eofEmitted = false;
    private final YWTextReader tr;
    private final EmitCallback emitCallback;

    @FunctionalInterface
    public interface EmitCallback {
        public void onEmit(YWHTMLToken token);
    }

    public enum State {
        DATA,
        RCDATA,
        RAWTEXT,
        PLAINTEXT,
        TAG_OPEN,
        END_TAG_OPEN,
        TAG_NAME,
        RCDATA_LESS_THAN_SIGN,
        RCDATA_END_TAG_OPEN,
        RCDATA_END_TAG_NAME,
        RAWTEXT_LESS_THAN_SIGN,
        RAWTEXT_END_TAG_OPEN,
        RAWTEXT_END_TAG_NAME,
        BEFORE_ATTRIBUTE_NAME,
        ATTRIBUTE_NAME,
        AFTER_ATTRIBUTE_NAME,
        BEFORE_ATTRIBUTE_VALUE,
        ATTRIBUTE_VALUE_DOUBLE_QUOTED,
        ATTRIBUTE_VALUE_SINGLE_QUOTED,
        ATTRIBUTE_VALUE_UNQUOTED,
        AFTER_ATTRIBUTE_VALUE_QUOTED,
        SELF_CLOSING_START_TAG,
        BOGUS_COMMENT,
        MARKUP_DECLARATION_OPEN,
        COMMENT_START,
        COMMENT_START_DASH,
        COMMENT,
        COMMENT_LESS_THAN_SIGN,
        COMMENT_END_DASH,
        COMMENT_END,
        DOCTYPE,
        BEFORE_DOCTYPE_NAME,
        DOCTYPE_NAME,
        AFTER_DOCTYPE_NAME,
        AFTER_DOCTYPE_PUBLIC_KEYWORD,
        BEFORE_DOCTYPE_PUBLIC_IDENTIFIER,
        DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED,
        DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED,
        AFTER_DOCTYPE_PUBLIC_IDENTIFIER,
        BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS,
        AFTER_DOCTYPE_SYSTEM_KEYWORD,
        BEFORE_DOCTYPE_SYSTEM_IDENTIFIER,
        DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED,
        DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED,
        AFTER_DOCTYPE_SYSTEM_IDENTIFIER,
        CHARACTER_REFERENCE,
        NAMED_CHARACTER_REFERENCE,
        NUMERIC_CHARACTER_REFERENCE,
        HEXADECIMAL_CHARACTER_REFERENCE_START,
        DECIMAL_CHARACTER_REFERENCE_START,
        HEXADECIMAL_CHARACTER_REFERENCE,
        DECIMAL_CHARACTER_REFERENCE,
        NUMERIC_CHARACTER_REFERENCE_END,
    }

    private YWHTMLTokenizer(String source, EmitCallback emitCallback) {
        this.tr = new YWTextReader(source);
        this.emitCallback = emitCallback;
    }

    private void emitToken(YWHTMLToken tk) {
        if (tk instanceof YWHTMLToken.Tag tagTk) {
            if (!tagTk.getAttrIndicesToRemove().isEmpty()) {
                List<YWAttr.Data> newAttrs = new ArrayList<>();
                for (int i = 0; i < tagTk.getAttrs().size(); i++) {
                    boolean isBadAttr = false;
                    for (int j = 0; j < tagTk.getAttrIndicesToRemove().size(); i++) {
                        if (tagTk.getAttrIndicesToRemove().get(j) == i) {
                            isBadAttr = true;
                            break;
                        }
                    }
                    if (!isBadAttr) {
                        newAttrs.add(tagTk.getAttrs().get(i));
                    }
                }
                tagTk.getAttrs().clear();
                tagTk.getAttrs().addAll(newAttrs);
            }
            if (tagTk.isStart()) {
                lastStartTagName = tagTk.getName().toString();
            }
        } else if (tk instanceof YWHTMLToken.EOF) {
            eofEmitted = true;
        }
        emitCallback.onEmit(tk);
    }

    private YWAttr.Data currentAttr() {
        YWHTMLToken.Tag tag = ((YWHTMLToken.Tag) currentToken);
        return tag.getAttrs().getLast();
    }

    private boolean isConsumedAsPartOfAttr() {
        return returnState == State.ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
                returnState == State.ATTRIBUTE_VALUE_SINGLE_QUOTED ||
                returnState == State.ATTRIBUTE_VALUE_UNQUOTED;
    }

    private void flushCodepointsConsumedAsCharReference() {
        if (isConsumedAsPartOfAttr()) {
            currentAttr().value += tempBuf;
        } else {
            int length = tempBuf.length();
            for (int offset = 0; offset < length;) {
                int codepoint = tempBuf.codePointAt(offset);
                emitToken(new YWHTMLToken.Character(codepoint));
                offset += Character.charCount(codepoint);
            }
        }
    }

    private void addAttrToCurrentTag(String name, String value) {
        YWHTMLToken.Tag tag = ((YWHTMLToken.Tag) currentToken);
        YWAttr.Data attr = new YWAttr.Data();
        attr.localName = name;
        attr.value = value;
        tag.getAttrs().add(attr);
    }

    private boolean isAppropriateEndTagToken(YWHTMLToken.Tag tk) {
        if (!tk.isEnd()) {
            return false;
        }
        return lastStartTagName.equals(tk.getName().toString());
    }

    private void runTokenizer() {
        if (parserPauseFlag) {
            throw new RuntimeException("TODO");
        }
        switch (state) {
            case DATA: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '&':
                        returnState = State.DATA;
                        state = State.CHARACTER_REFERENCE;
                        break;
                    case '<':
                        state = State.TAG_OPEN;
                        break;
                    case '\0':
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.Character(nextChar));
                        break;
                    case -1:
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        emitToken(new YWHTMLToken.Character(nextChar));
                        break;
                }
                break;
            }
            case RCDATA: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '&':
                        returnState = State.RCDATA;
                        state = State.CHARACTER_REFERENCE;
                        break;
                    case '<':
                        state = State.RCDATA_LESS_THAN_SIGN;
                        break;
                    case '\0':
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.Character(0xfffd));
                        break;
                    case -1:
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        emitToken(new YWHTMLToken.Character(nextChar));
                        break;
                }
                break;
            }
            case RAWTEXT: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '<':
                        state = State.RAWTEXT_LESS_THAN_SIGN;
                        break;
                    case '\0':
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.Character(0xfffd));
                        break;
                    case -1:
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        emitToken(new YWHTMLToken.Character(nextChar));
                        break;
                }
                break;
            }
            case PLAINTEXT: {
                // TODO: PLAINTEXT
                throw new RuntimeException("TODO");
            }
            case TAG_OPEN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '!':
                        state = State.MARKUP_DECLARATION_OPEN;
                        break;
                    case '/':
                        state = State.END_TAG_OPEN;
                        break;
                    case '?':
                        // PARSE ERROR
                        currentToken = new YWHTMLToken.Comment();
                        tr.setCursor(oldCursor);
                        state = State.BOGUS_COMMENT;
                        break;
                    case -1:
                        emitToken(new YWHTMLToken.Character('<'));
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        if (YWUtility.isAsciiAlpha(nextChar)) {
                            currentToken = new YWHTMLToken.Tag(false);
                            tr.setCursor(oldCursor);
                            state = State.TAG_NAME;
                        } else {
                            // PARSE ERROR
                            emitToken(new YWHTMLToken.Character('<'));
                            tr.setCursor(oldCursor);
                            state = State.DATA;
                        }
                }
                break;
            }
            case END_TAG_OPEN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '>':
                        // PARSE ERROR
                        state = State.DATA;
                        break;
                    case -1:
                        emitToken(new YWHTMLToken.Character('<'));
                        emitToken(new YWHTMLToken.Character('/'));
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        if (YWUtility.isAsciiAlpha(nextChar)) {
                            currentToken = new YWHTMLToken.Tag(true);
                            tr.setCursor(oldCursor);
                            state = State.TAG_NAME;
                        } else {
                            // PARSE ERROR
                            currentToken = new YWHTMLToken.Comment();
                            tr.setCursor(oldCursor);
                            state = State.BOGUS_COMMENT;
                        }
                }
                break;
            }
            case TAG_NAME: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_ATTRIBUTE_NAME;
                        break;
                    case '/':
                        state = State.SELF_CLOSING_START_TAG;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '\0':
                        // PARSE ERROR
                        ((YWHTMLToken.Tag) currentToken).getName().append('\ufffd');
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default: {
                        int chr = Character.toString(nextChar).toLowerCase(Locale.ROOT).codePointAt(0);
                        ((YWHTMLToken.Tag) currentToken).getName().append(chr);
                    }
                }
                break;
            }
            case RCDATA_LESS_THAN_SIGN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '/':
                        tempBuf = new StringBuilder();
                        state = State.RCDATA_END_TAG_OPEN;
                        break;
                    default:
                        emitToken(new YWHTMLToken.Character('<'));
                        tr.setCursor(oldCursor);
                        state = State.RCDATA;
                }
                break;
            }
            case RCDATA_END_TAG_OPEN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiAlpha(nextChar)) {
                    currentToken = new YWHTMLToken.Tag(true);
                    tr.setCursor(oldCursor);
                    state = State.RCDATA_END_TAG_NAME;
                } else {
                    emitToken(new YWHTMLToken.Character('<'));
                    emitToken(new YWHTMLToken.Character('/'));
                    tr.setCursor(oldCursor);
                    state = State.RCDATA;
                }
                break;
            }
            case RCDATA_END_TAG_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                Runnable anythingElse = () -> {
                    emitToken(new YWHTMLToken.Character('<'));
                    emitToken(new YWHTMLToken.Character('/'));
                    tempBuf.codePoints().forEach(c -> {
                        emitToken(new YWHTMLToken.Character(c));
                    });
                    tr.setCursor(oldCursor);
                    state = State.RCDATA;
                };

                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.BEFORE_ATTRIBUTE_NAME;
                            break;
                        }
                        anythingElse.run();
                    case '/':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.SELF_CLOSING_START_TAG;
                            break;
                        }
                        anythingElse.run();
                    case '>':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.DATA;
                            emitToken(currentToken);
                            break;
                        }
                        anythingElse.run();
                    default:
                        if (YWUtility.isAsciiAlpha(nextChar)) {
                            int chr = Character.toString(nextChar).toLowerCase(Locale.ROOT).codePointAt(0);
                            tempBuf.append(chr);
                            break;
                        }
                        anythingElse.run();
                }
                break;
            }
            case RAWTEXT_LESS_THAN_SIGN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '/':
                        tempBuf = new StringBuilder();
                        state = State.RAWTEXT_END_TAG_OPEN;
                        break;
                    default:
                        emitToken(new YWHTMLToken.Character('<'));
                        tr.setCursor(oldCursor);
                        state = State.RAWTEXT;
                }
                break;
            }
            case RAWTEXT_END_TAG_OPEN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiAlpha(nextChar)) {
                    currentToken = new YWHTMLToken.Tag(true);
                    tr.setCursor(oldCursor);
                    state = State.RAWTEXT_END_TAG_NAME;
                } else {
                    emitToken(new YWHTMLToken.Character('<'));
                    emitToken(new YWHTMLToken.Character('/'));
                    tr.setCursor(oldCursor);
                    state = State.RAWTEXT;
                }
                break;
            }
            case RAWTEXT_END_TAG_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();

                Runnable anythingElse = () -> {
                    emitToken(new YWHTMLToken.Character('<'));
                    emitToken(new YWHTMLToken.Character('/'));
                    tempBuf.codePoints().forEach(c -> {
                        emitToken(new YWHTMLToken.Character(c));
                    });
                    tr.setCursor(oldCursor);
                    state = State.RAWTEXT;
                };

                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.BEFORE_ATTRIBUTE_NAME;
                            break;
                        }
                        anythingElse.run();
                    case '/':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.SELF_CLOSING_START_TAG;
                            break;
                        }
                        anythingElse.run();
                    case '>':
                        if (isAppropriateEndTagToken((YWHTMLToken.Tag) currentToken)) {
                            state = State.DATA;
                            emitToken(currentToken);
                            break;
                        }
                        anythingElse.run();
                    default:
                        if (YWUtility.isAsciiAlpha(nextChar)) {
                            int chr = Character.toString(nextChar).toLowerCase(Locale.ROOT).codePointAt(0);
                            tempBuf.append(chr);
                            break;
                        }
                        anythingElse.run();
                }
                break;
            }

            case BEFORE_ATTRIBUTE_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '/':
                    case '>':
                    case -1:
                        tr.setCursor(oldCursor);
                        state = State.AFTER_ATTRIBUTE_NAME;
                        break;
                    case '=': {
                        String nameStr = Character.toString(nextChar);
                        addAttrToCurrentTag(nameStr, "");
                        tr.setCursor(oldCursor);
                        state = State.ATTRIBUTE_NAME;
                        break;
                    }
                    default:
                        addAttrToCurrentTag("", "");
                        tr.setCursor(oldCursor);
                        state = State.ATTRIBUTE_NAME;
                        break;
                }
                break;
            }
            case ATTRIBUTE_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                Runnable anythingElse = () -> {
                    currentAttr().localName += nextChar;
                };
                Runnable checkDupliateAttrName = () -> {
                    YWHTMLToken.Tag tag = ((YWHTMLToken.Tag) currentToken);
                    YWAttr.Data currentAttr = currentAttr();
                    for (int i = 0; i < tag.getAttrs().size(); i++) {
                        if (tag.getAttrs().get(i) == currentAttr) {
                            continue;
                        }
                        if (currentAttr.localName.equals(tag.getAttrs().get(i).localName)) {
                            tag.getAttrIndicesToRemove().add(i);
                        }
                    }
                };

                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                    case '/':
                    case '>':
                    case -1:
                        tr.setCursor(oldCursor);
                        state = State.AFTER_ATTRIBUTE_NAME;
                        checkDupliateAttrName.run();
                        break;
                    case '=':
                        state = State.BEFORE_ATTRIBUTE_VALUE;
                        checkDupliateAttrName.run();
                        break;
                    case '\0':
                        // PARSE ERROR
                        currentAttr().localName += '\ufffd';
                        break;
                    case '"':
                    case '\\':
                    case '<':
                        // PARSE ERROR
                        anythingElse.run();
                        break;
                    default:
                        anythingElse.run();
                        break;
                }
                break;
            }
            case AFTER_ATTRIBUTE_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '/':
                        state = State.SELF_CLOSING_START_TAG;
                        break;
                    case '=':
                        state = State.BEFORE_ATTRIBUTE_VALUE;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        addAttrToCurrentTag("", "");
                        tr.setCursor(oldCursor);
                        state = State.ATTRIBUTE_NAME;
                        break;
                }
                break;
            }
            case BEFORE_ATTRIBUTE_VALUE: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '"':
                        state = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        state = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                        break;
                    case '>':
                        // PARSE ERROR
                        state = State.DATA;
                        break;
                    default:
                        tr.setCursor(oldCursor);
                        state = State.ATTRIBUTE_VALUE_UNQUOTED;
                }
                break;
            }
            case ATTRIBUTE_VALUE_DOUBLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                        break;
                    case '&':
                        returnState = State.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                        state = State.CHARACTER_REFERENCE;
                        break;
                    case '\0':
                        // PARSE ERROR
                        currentAttr().value += '\ufffd';
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        currentAttr().value += nextChar;
                        break;
                }
                break;
            }
            case ATTRIBUTE_VALUE_SINGLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\'':
                        state = State.AFTER_ATTRIBUTE_VALUE_QUOTED;
                        break;
                    case '&':
                        returnState = State.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                        state = State.CHARACTER_REFERENCE;
                        break;
                    case '\0':
                        // PARSE ERROR
                        currentAttr().value += '\ufffd';
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        currentAttr().value += nextChar;
                        break;
                }
                break;
            }
            case ATTRIBUTE_VALUE_UNQUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_ATTRIBUTE_NAME;
                        break;
                    case '&':
                        returnState = State.ATTRIBUTE_VALUE_UNQUOTED;
                        state = State.CHARACTER_REFERENCE;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '\0':
                        // PARSE ERROR
                        currentAttr().value += '\ufffd';
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        currentAttr().value += nextChar;
                        break;
                }
                break;
            }
            case AFTER_ATTRIBUTE_VALUE_QUOTED: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_ATTRIBUTE_NAME;
                        break;
                    case '/':
                        state = State.SELF_CLOSING_START_TAG;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        tr.setCursor(oldCursor);
                        state = State.BEFORE_ATTRIBUTE_NAME;
                        break;
                }
                break;
            }
            case SELF_CLOSING_START_TAG: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '>':
                        ((YWHTMLToken.Tag) currentToken).setSelfClosing(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        tr.setCursor(oldCursor);
                        state = State.BEFORE_ATTRIBUTE_NAME;
                        break;
                }
                break;
            }
            case BOGUS_COMMENT: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    case '\0':
                        // PARSE ERROR
                        ((YWHTMLToken.Comment) currentToken).getData().append('\ufffd');
                        break;
                    default:
                        ((YWHTMLToken.Comment) currentToken).getData().append(nextChar);
                        break;
                }
                break;
            }
            case MARKUP_DECLARATION_OPEN: {
                if (tr.consumeString("--", YWTextReader.NO_MATCH_FLAGS)) {
                    currentToken = new YWHTMLToken.Comment();
                    state = State.COMMENT_START;
                } else if (tr.consumeString("DOCTYPE", YWTextReader.ASCII_CASE_INSENSITIVE)) {
                    state = State.DOCTYPE;
                } else if (tr.consumeString("[CDATA[", YWTextReader.NO_MATCH_FLAGS)) {
                    throw new RuntimeException("TODO");
                } else {
                    // PARSE ERROR
                    currentToken = new YWHTMLToken.Comment();
                    state = State.BOGUS_COMMENT;
                }
                break;
            }
            case COMMENT_START: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '-':
                        state = State.COMMENT_START_DASH;
                        break;
                    case '>':
                        // PARSE ERROR
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    default:
                        tr.setCursor(oldCursor);
                        state = State.COMMENT;
                        break;
                }
                break;
            }
            case COMMENT_START_DASH: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '-':
                        state = State.COMMENT_END;
                        break;
                    case '>':
                        // PARSE ERROR
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Comment) currentToken).getData().append("-");
                        tr.setCursor(oldCursor);
                        state = State.COMMENT;
                        break;
                }
                break;
            }
            case COMMENT: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '<':
                        ((YWHTMLToken.Comment) currentToken).getData().append("<");
                        state = State.COMMENT_LESS_THAN_SIGN;
                        break;
                    case '-':
                        state = State.COMMENT_END_DASH;
                        break;
                    case '\0':
                        // PARSE ERROR
                        ((YWHTMLToken.Comment) currentToken).getData().append('\ufffd');
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Comment) currentToken).getData().append(nextChar);
                        break;
                }
                break;
            }
            case COMMENT_LESS_THAN_SIGN: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '!':
                        ((YWHTMLToken.Comment) currentToken).getData().append(nextChar);
                        throw new RuntimeException("TODO");
                    /* state = State.COMMENT_LESS_THAN_SIGN_BANG; */
                    case '<':
                        ((YWHTMLToken.Comment) currentToken).getData().append(nextChar);
                        break;
                    default:
                        tr.setCursor(oldCursor);
                        state = State.COMMENT;
                        break;
                }
                break;
            }
            case COMMENT_END_DASH: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '-':
                        state = State.COMMENT_END;
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Comment) currentToken).getData().append("-");
                        tr.setCursor(oldCursor);
                        state = State.COMMENT;
                        break;
                }
                break;
            }
            case COMMENT_END: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '!':
                        throw new RuntimeException("TODO");
                    // state = State.COMMENT_END_BANG;
                    case -1:
                        // PARSE ERROR
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Comment) currentToken).getData().append("--");
                        tr.setCursor(oldCursor);
                        state = State.BOGUS_COMMENT;
                        break;
                }
                break;
            }
            case DOCTYPE: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_DOCTYPE_NAME;
                        break;
                    case '>':
                        tr.setCursor(oldCursor);
                        state = State.BEFORE_DOCTYPE_NAME;
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.Doctype());
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        tr.setCursor(oldCursor);
                        state = State.BEFORE_DOCTYPE_NAME;
                        break;
                }
                break;
            }
            case BEFORE_DOCTYPE_NAME: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '\0':
                        // PARSE ERROR
                        currentToken = new YWHTMLToken.Doctype();
                        ((YWHTMLToken.Doctype) currentToken).getName().append('\ufffd');
                        break;
                    case '>':
                        // PARSE ERROR
                        currentToken = new YWHTMLToken.Doctype();
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        break;
                    case -1:
                        // PARSE ERROR
                        emitToken(new YWHTMLToken.Doctype());
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        currentToken = new YWHTMLToken.Doctype();
                        ((YWHTMLToken.Doctype) currentToken)
                                .setName(new StringBuilder(Character.toString(nextChar).toLowerCase(Locale.ROOT)));
                        state = State.DOCTYPE_NAME;
                }
                break;
            }
            case DOCTYPE_NAME: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.AFTER_DOCTYPE_NAME;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '\0':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).getName().append('\ufffd');
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Doctype) currentToken).getName().append(
                                Character.toString(nextChar).toString().toLowerCase(Locale.ROOT).codePointAt(0));
                        break;
                }
                break;
            }
            case AFTER_DOCTYPE_NAME: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        tr.setCursor(oldCursor);
                        if (tr.consumeString("PUBLIC", YWTextReader.ASCII_CASE_INSENSITIVE)) {
                            state = State.AFTER_DOCTYPE_PUBLIC_KEYWORD;
                        } else if (tr.consumeString("SYSTEM", YWTextReader.ASCII_CASE_INSENSITIVE)) {
                            state = State.AFTER_DOCTYPE_SYSTEM_KEYWORD;
                        } else {
                            // PARSE ERROR
                            ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                            throw new RuntimeException("TODO");
                            /* state = State.BOGUS_DOCTYPE; */
                        }
                }
                break;
            }
            case AFTER_DOCTYPE_PUBLIC_KEYWORD: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;
                        break;
                    case '"':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setPublicId(new StringBuilder());
                        state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setPublicId(new StringBuilder());
                        state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = State.BOGUS_DOCTYPE; */
                }
                break;
            }
            case BEFORE_DOCTYPE_PUBLIC_IDENTIFIER: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '"':
                        ((YWHTMLToken.Doctype) currentToken).setPublicId(new StringBuilder());
                        state = State.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        ((YWHTMLToken.Doctype) currentToken).setPublicId(new StringBuilder());
                        state = State.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = State.BOGUS_DOCTYPE; */
                }
                break;
            }
            case DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Doctype) currentToken).getPublicId().append(nextChar);
                        break;
                }
                break;
            }
            case DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\'':
                        state = State.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Doctype) currentToken).getPublicId().append(nextChar);
                        break;
                }
                break;
            }
            case AFTER_DOCTYPE_PUBLIC_IDENTIFIER: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '"':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = BOGUS_DOCTYPE; */
                }
                break;
            }
            case BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case '"':
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = State.BOGUS_DOCTYPE; */
                }
                break;
            }
            case AFTER_DOCTYPE_SYSTEM_KEYWORD: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        state = State.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;
                        break;
                    case '"':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = State.BOGUS_DOCTYPE; */
                }
                break;
            }
            case BEFORE_DOCTYPE_SYSTEM_IDENTIFIER: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '"':
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;
                        break;
                    case '\'':
                        ((YWHTMLToken.Doctype) currentToken).setSystemId(new StringBuilder());
                        state = State.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = State.BOGUS_DOCTYPE; */
                }
                break;
            }
            case DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '"':
                        state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Doctype) currentToken).getSystemId().append(nextChar);
                        break;
                }
                break;
            }
            case DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED: {
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\'':
                        state = State.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;
                        break;
                    case '>':
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        ((YWHTMLToken.Doctype) currentToken).getSystemId().append(nextChar);
                        break;
                }
                break;
            }
            case AFTER_DOCTYPE_SYSTEM_IDENTIFIER: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '\t':
                    case '\n':
                    case '\f':
                    case ' ':
                        break;
                    case '>':
                        state = State.DATA;
                        emitToken(currentToken);
                        break;
                    case -1:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        emitToken(currentToken);
                        emitToken(new YWHTMLToken.EOF());
                        break;
                    default:
                        // PARSE ERROR
                        ((YWHTMLToken.Doctype) currentToken).setForceQuirks(true);
                        tr.setCursor(oldCursor);
                        throw new RuntimeException("TODO");
                    /* state = BOGUS_DOCTYPE; */
                }
                break;
            }
            case CHARACTER_REFERENCE: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case '#':
                        tempBuf.append(nextChar);
                        state = State.NUMERIC_CHARACTER_REFERENCE;
                        break;
                    default:
                        if (YWUtility.isAsciiAlphanumeric(nextChar)) {
                            tr.setCursor(oldCursor);
                            state = State.NAMED_CHARACTER_REFERENCE;
                        } else {
                            flushCodepointsConsumedAsCharReference();
                            tr.setCursor(oldCursor);
                            state = returnState;
                        }
                }
                break;
            }
            case NAMED_CHARACTER_REFERENCE: {
                String foundName = null;
                String foundStr = null;
                int cursorAfterFound = -1;
                for (int i = 0; i < YWHTMLEntities.ENTRIES.length; i++) {
                    if (!YWHTMLEntities.ENTRIES[i].name().startsWith("&")) {
                        logger.warning("internal warning: key " + YWHTMLEntities.ENTRIES[i].name()
                                + " in YWHTMLEntities.ENTRIES doesn't start with &");
                        continue;
                    }
                    int cursorBeforeStr = tr.getCursor();
                    if (tr.consumeString(YWHTMLEntities.ENTRIES[i].name().substring(1), YWTextReader.NO_MATCH_FLAGS)) {
                        if (foundName == null || foundName.length() < YWHTMLEntities.ENTRIES[i].name().length()) {
                            foundName = YWHTMLEntities.ENTRIES[i].name();
                            foundStr = YWHTMLEntities.ENTRIES[i].chars();
                            cursorAfterFound = tr.getCursor();
                        }
                        tr.setCursor(cursorBeforeStr);
                    }
                }
                if (foundName != null) {
                    assert cursorAfterFound != -1;
                    tr.setCursor(cursorAfterFound);
                    if (isConsumedAsPartOfAttr() &&
                            foundName.charAt(foundName.length() - 1) != ';' &&
                            (tr.getNextChar() == '=' || YWUtility.isAsciiAlphanumeric(tr.getNextChar()))) {
                        flushCodepointsConsumedAsCharReference();
                        state = returnState;
                    } else {
                        if (foundName.charAt(foundName.length() - 1) != ';') {
                            // PARSE ERROR
                        }
                        tempBuf = new StringBuilder(foundStr);
                        flushCodepointsConsumedAsCharReference();
                        state = returnState;
                    }
                } else {
                    flushCodepointsConsumedAsCharReference();
                    state = returnState;
                }
                break;
            }
            case NUMERIC_CHARACTER_REFERENCE: {
                characterReferenceCode = 0;

                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                switch (nextChar) {
                    case 'X':
                    case 'x':
                        tempBuf.append(nextChar);
                        state = State.HEXADECIMAL_CHARACTER_REFERENCE_START;
                        break;
                    default:
                        tr.setCursor(oldCursor);
                        state = State.DECIMAL_CHARACTER_REFERENCE_START;
                        break;
                }
                break;
            }
            case HEXADECIMAL_CHARACTER_REFERENCE_START: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiHexDigit(nextChar)) {
                    tr.setCursor(oldCursor);
                    state = State.HEXADECIMAL_CHARACTER_REFERENCE;
                } else {
                    // PARSE ERROR
                    tr.setCursor(oldCursor);
                    state = returnState;
                }
                break;
            }
            case DECIMAL_CHARACTER_REFERENCE_START: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiDigit(nextChar)) {
                    tr.setCursor(oldCursor);
                    state = State.DECIMAL_CHARACTER_REFERENCE;
                } else {
                    // PARSE ERROR
                    tr.setCursor(oldCursor);
                    state = returnState;
                }
                break;
            }
            case HEXADECIMAL_CHARACTER_REFERENCE: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiDigit(nextChar)) {
                    characterReferenceCode = (characterReferenceCode * 16) + (nextChar - '0');
                } else if (YWUtility.isAsciiUppercaseHexDigit(nextChar)) {
                    characterReferenceCode = (characterReferenceCode * 16) + (nextChar - 'A' + 10);
                } else if (YWUtility.isAsciiLowercaseHexDigit(nextChar)) {
                    characterReferenceCode = (characterReferenceCode * 16) + (nextChar - 'a' + 10);
                } else if (nextChar == ';') {
                    state = State.NUMERIC_CHARACTER_REFERENCE_END;
                } else {
                    // PARSE ERROR
                    tr.setCursor(oldCursor);
                    state = State.NUMERIC_CHARACTER_REFERENCE_END;
                }
                break;
            }
            case DECIMAL_CHARACTER_REFERENCE: {
                int oldCursor = tr.getCursor();
                int nextChar = tr.consumeChar();
                if (YWUtility.isAsciiDigit(nextChar)) {
                    characterReferenceCode = (characterReferenceCode * 10) + (nextChar - '0');
                } else if (nextChar == ';') {
                    state = State.NUMERIC_CHARACTER_REFERENCE_END;
                } else {
                    // PARSE ERROR
                    tr.setCursor(oldCursor);
                    state = State.NUMERIC_CHARACTER_REFERENCE_END;
                }
                break;
            }
            case NUMERIC_CHARACTER_REFERENCE_END: {
                if (characterReferenceCode == 0x0000) {
                    // PARSE ERROR
                    characterReferenceCode = 0xfffd;
                } else if (0x10ffff < characterReferenceCode) {
                    // PARSE ERROR
                    characterReferenceCode = 0xfffd;
                } else if (YWUtility.isSurrogateChar(characterReferenceCode)) {
                    // PARSE ERROR
                    characterReferenceCode = 0xfffd;
                } else if (YWUtility.isNoncharacter(characterReferenceCode)) {
                    // PARSE ERROR
                } else if (characterReferenceCode == 0x0d ||
                        (YWUtility.isControlCharacter(characterReferenceCode)
                                && !YWUtility.isAsciiWhitespace(characterReferenceCode))) {
                    // PARSE ERROR
                    switch (characterReferenceCode) {
                        case 0x80:
                            characterReferenceCode = 0x20ac;
                            break;
                        case 0x82:
                            characterReferenceCode = 0x201a;
                            break;
                        case 0x83:
                            characterReferenceCode = 0x0192;
                            break;
                        case 0x84:
                            characterReferenceCode = 0x201e;
                            break;
                        case 0x85:
                            characterReferenceCode = 0x2026;
                            break;
                        case 0x86:
                            characterReferenceCode = 0x2020;
                            break;
                        case 0x87:
                            characterReferenceCode = 0x2021;
                            break;
                        case 0x88:
                            characterReferenceCode = 0x02c6;
                            break;
                        case 0x89:
                            characterReferenceCode = 0x2030;
                            break;
                        case 0x8a:
                            characterReferenceCode = 0x0160;
                            break;
                        case 0x8b:
                            characterReferenceCode = 0x2039;
                            break;
                        case 0x8c:
                            characterReferenceCode = 0x0152;
                            break;
                        case 0x8e:
                            characterReferenceCode = 0x017d;
                            break;
                        case 0x91:
                            characterReferenceCode = 0x2018;
                            break;
                        case 0x92:
                            characterReferenceCode = 0x2019;
                            break;
                        case 0x93:
                            characterReferenceCode = 0x201c;
                            break;
                        case 0x94:
                            characterReferenceCode = 0x201d;
                            break;
                        case 0x95:
                            characterReferenceCode = 0x2022;
                            break;
                        case 0x96:
                            characterReferenceCode = 0x2013;
                            break;
                        case 0x97:
                            characterReferenceCode = 0x2014;
                            break;
                        case 0x98:
                            characterReferenceCode = 0x02dc;
                            break;
                        case 0x99:
                            characterReferenceCode = 0x2122;
                            break;
                        case 0x9a:
                            characterReferenceCode = 0x0161;
                            break;
                        case 0x9b:
                            characterReferenceCode = 0x203a;
                            break;
                        case 0x9c:
                            characterReferenceCode = 0x0153;
                            break;
                        case 0x9e:
                            characterReferenceCode = 0x017e;
                            break;
                        case 0x9f:
                            characterReferenceCode = 0x0178;
                            break;
                    }
                }
                tempBuf = new StringBuilder(Character.toString(characterReferenceCode));
                flushCodepointsConsumedAsCharReference();
                state = returnState;
                break;
            }
        }
    }

    public static void tokenize(String source, EmitCallback emitCallback) {
        YWHTMLTokenizer tkr = new YWHTMLTokenizer(source, emitCallback);
        while (!tkr.eofEmitted) {
            tkr.runTokenizer();
        }
    }

}
