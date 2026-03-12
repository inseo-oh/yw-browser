package io.github.inseooh.yw.url;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.encoding.YWEncoding;
import io.github.inseooh.yw.encoding.YWEncodingDecoder;
import io.github.inseooh.yw.encoding.YWEncodingEncoder;
import io.github.inseooh.yw.encoding.YWIOQueue;

/**
 * @see <a href="https://url.spec.whatwg.org/#concept-url">
 *      Relevant section in URL specification</a>
 */
public final class YWURL {
    private String scheme = "";
    private String username = "";
    private String password = "";
    private Host host = null;
    private Integer port = null;
    private List<String> path = new ArrayList<>();
    private String query = null;
    private String fragment = null;
    private Object blobURLEntry = null; // STUB

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#concept-host">
     *      Relevant section in URL specification</a>
     */
    private sealed interface Host {
        public record Domain(String domain) implements Host {
            @Override
            public String serializer() {
                return domain;
            }
        };

        public record Empty() implements Host {
            @Override
            public String serializer() {
                return "";
            }
        }

        public String serializer();
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#forbidden-host-code-point">
     *      Relevant section in URL specification</a>
     */
    private static boolean isForbiddenHostCodePoint(int codePoint) {
        switch (codePoint) {
            case 0x0000:
            case '\t':
            case '\n':
            case '\r':
            case ' ':
            case '#':
            case '/':
            case ':':
            case '<':
            case '>':
            case '?':
            case '@':
            case '[':
            case '\\':
            case ']':
            case '^':
            case '|':
                return true;
        }
        return false;
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#forbidden-domain-code-point">
     *      Relevant section in URL specification</a>
     */
    private static boolean isForbiddenDomainHostCodePoint(int codePoint) {
        if (isForbiddenHostCodePoint(codePoint) || YWUtility.isC0ControlCharacter(codePoint)) {
            return true;
        }
        switch (codePoint) {
            case '%':
            case 0x007f:
                return true;
        }
        return false;
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#single-dot-path-segment">
     *      Relevant section in URL specification</a>
     */
    private static boolean isSingleDotURLPathSegment(String s) {
        return s.equals(".") || s.toLowerCase(Locale.ROOT).equals("%2e");
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#double-dot-path-segment">
     *      Relevant section in URL specification</a>
     */
    private static boolean isDoubleDotURLPathSegment(String s) {
        return s.equals("..") ||
                s.toLowerCase(Locale.ROOT).equals(".%2e") ||
                s.toLowerCase(Locale.ROOT).equals("%2e.") ||
                s.toLowerCase(Locale.ROOT).equals("%2e%2e");
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#percent-encode">
     *      Relevant section in URL specification</a>
     */
    private static String percentEncode(int b) {
        return String.format("%02X", b);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#percent-decode">
     *      Relevant section in URL specification</a>
     */
    private static int[] percentDecode(int[] input) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.11.)

        // S1.
        List<Integer> output = new ArrayList<>();

        // S2.
        for (int i = 0; i < input.length; i++) {
            int byt = input[i];

            // S2-1.
            if (byt != '%') {
                output.add(byt);
            }

            // S2-2.
            else if (byt == '%' &&
                    (input.length <= i + 2 ||
                            input[i + 1] < '0' || '9' < input[i + 1] || input[i + 2] < '0' || '9' < input[i + 2])) {
                output.add(byt);
            }

            // S2-3.
            else {
                // S2-3-1.
                StringBuilder sb = new StringBuilder();
                sb.appendCodePoint(input[i + 1]);
                sb.appendCodePoint(input[i + 2]);
                int bytePoint = Integer.parseInt(sb.toString(), 16);

                // S2-3-2.
                output.add(bytePoint);

                // S2-3-3.
                i += 2;
            }
        }

        // S3.
        int[] res = new int[output.size()];
        for (int i = 0; i < res.length; i++) {
            res[i] = output.get(i);
        }
        return res;
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#string-percent-decode">
     *      Relevant section in URL specification</a>
     */
    private static int[] percentDecode(String input) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.11.)

        // S1.
        int[] bytes = YWEncodingEncoder.utf8Encode(YWIOQueue.fromString(input)).toArray();

        // S2.
        return percentDecode(bytes);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#c0-control-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> C0_CONTROL_PERCENT_ENCODE_SET = cp -> {
        return YWUtility.isC0ControlCharacter(cp) || 0x7e < cp;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#fragment-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> FRAGMENT_PERCENT_ENCODE_SET = cp -> {
        if (C0_CONTROL_PERCENT_ENCODE_SET.apply(cp)) {
            return true;
        }
        switch ((int) cp) {
            case ' ':
            case '\"':
            case '<':
            case '>':
            case '`':
                return true;
        }
        return false;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#query-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> QUERY_PERCENT_ENCODE_SET = cp -> {
        if (C0_CONTROL_PERCENT_ENCODE_SET.apply(cp)) {
            return true;
        }
        switch ((int) cp) {
            case ' ':
            case '\"':
            case '#':
            case '<':
            case '>':
                return true;
        }
        return false;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#special-query-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> SPECIAL_QUERY_PERCENT_ENCODE_SET = cp -> {
        return QUERY_PERCENT_ENCODE_SET.apply(cp) || cp == '\'';
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#path-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> PATH_PERCENT_ENCODE_SET = cp -> {
        if (QUERY_PERCENT_ENCODE_SET.apply(cp)) {
            return true;
        }
        switch ((int) cp) {
            case '?':
            case '^':
            case '`':
            case '{':
            case '}':
                return true;
        }
        return false;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#userinfo-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> USERINFO_PERCENT_ENCODE_SET = cp -> {
        if (PATH_PERCENT_ENCODE_SET.apply(cp)) {
            return true;
        }
        switch ((int) cp) {
            case '/':
            case ':':
            case ';':
            case '=':
            case '@':
            case '|':
                return true;
        }
        if ('[' <= cp && cp <= ']') {
            return true;
        }
        return false;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#component-percent-encode-set">
     *      Relevant section in URL specification</a>
     */
    private static final Function<Integer, Boolean> COMPONENT_PERCENT_ENCODE_SET = cp -> {
        if (USERINFO_PERCENT_ENCODE_SET.apply(cp)) {
            return true;
        }
        switch ((int) cp) {
            case '+':
            case ',':
                return true;
        }
        if ('$' <= cp && cp <= '&') {
            return true;
        }
        return false;
    };

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#string-percent-encode-after-encoding">
     *      Relevant section in URL specification</a>
     */
    private static String percentEncodeAfterEncoding(YWEncoding encoding, String input,
            Function<Integer, Boolean> percentEncodeSet, boolean spaceAsPlus) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.10.)

        // S1.
        YWEncodingEncoder encoder = YWEncodingEncoder.getEncoder(encoding);

        // S2.
        YWIOQueue inputQueue = new YWIOQueue();
        input.codePoints().forEach(i -> inputQueue.push(i));

        // S3.
        StringBuilder output = new StringBuilder();

        // S4.
        Integer potentialError = 0;

        // S5.
        while (potentialError != null) {
            // S5-1.
            YWIOQueue encodeOutput = new YWIOQueue();

            // S5-2.
            potentialError = encoder.encodeOrFail(inputQueue, encodeOutput);

            // S5-3.
            for (int byt : encodeOutput.toArray()) {
                // S5-3-1.
                if (spaceAsPlus && byt == ' ') {
                    output.append('+');
                    continue;
                }

                // S5-3-2.
                int isomorph = byt;

                // S5-3-3.
                // NOTE: I would like to write assertion for this, but checking if
                // percentEncodeSet contains all non-ASCII code points, isn't really possible.

                // S5-3-4.
                if (!percentEncodeSet.apply(isomorph)) {
                    output.append('+');
                }

                // S5-3-5.
                else {
                    output.append(percentEncode(byt));
                }
            }

            // S5-4.
            if (potentialError != null) {
                output.append("%26%23" + potentialError + "%3B");
            }
        }

        // S6.
        return output.toString();
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#string-percent-encode-after-encoding">
     *      Relevant section in URL specification</a>
     */
    private static String percentEncodeAfterEncoding(YWEncoding encoding, String input,
            Function<Integer, Boolean> percentEncodeSet) {
        return percentEncodeAfterEncoding(encoding, input, percentEncodeSet, false);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#utf-8-percent-encode">
     *      Relevant section in URL specification</a>
     */
    private static String utf8PercentEncode(int scalarValue, Function<Integer, Boolean> percentEncodeSet) {
        return percentEncodeAfterEncoding(YWEncoding.UTF8, Character.toString(scalarValue), percentEncodeSet);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#string-utf-8-percent-encode">
     *      Relevant section in URL specification</a>
     */
    private static String utf8PercentEncode(String input, Function<Integer, Boolean> percentEncodeSet) {
        return percentEncodeAfterEncoding(YWEncoding.UTF8, input, percentEncodeSet);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#concept-domain-to-ascii">
     *      Relevant section in URL specification</a>
     */
    private static String domainToASCII(String input, boolean beStrict) throws YWSyntaxError {
        // TODO: Implement domainToASCII()
        return input;
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#ends-in-a-number-checker">
     *      Relevant section in URL specification</a>
     */
    private static boolean endsInNumber(String input) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.11.)

        // S1.
        String[] parts = input.split("\\.", -1);

        // S2.
        if (parts[parts.length - 1].isEmpty()) {
            // S2-1.
            if (parts.length == 1) {
                return false;
            }
            List<String> tempParts = Arrays.asList(parts);
            tempParts.removeLast();
            parts = tempParts.toArray(new String[0]);
        }

        // S3.
        String last = parts[parts.length - 1];

        // S4.
        if (!last.isEmpty() && last.codePoints().allMatch(i -> YWUtility.isAsciiDigit(i))) {
            return true;
        }

        // S5.
        try {
            ipv4Parser(last);
            return true;
        } catch (YWSyntaxError e) {
        }

        // S6
        return false;
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#concept-ipv4-parser">
     *      Relevant section in URL specification</a>
     */
    private static void ipv4Parser(String input) throws YWSyntaxError {
        // TODO: Implement IPv4 parser
        throw new YWSyntaxError();
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#host-parsing">
     *      Relevant section in URL specification</a>
     */
    private static Host hostParser(String input, boolean isOpaque) throws YWSyntaxError {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.09.)

        // S1.
        if (input.startsWith("[")) {
            // S1-1.
            if (!input.endsWith("]")) {
                // VALIDATION ERROR
                throw new YWSyntaxError();
            }
            // S1-2.
            // TODO: Implement S1-2
            throw new RuntimeException("TODO");
        }

        // S2.
        if (isOpaque) {
            return opaqueHostParser(input);
        }

        // S3.
        assert !input.isEmpty();

        // S4.
        String domain = YWEncodingDecoder.utf8DecodeWithoutBOM(YWIOQueue.fromArray(percentDecode(input)))
                .itemsToString();

        String asciiDomain;
        try {
            // S5.
            asciiDomain = domainToASCII(domain, false);
        } catch (YWSyntaxError e) {
            // S6.
            throw e;
        }

        // S7.
        if (endsInNumber(asciiDomain)) {
            // TODO: Implement S7
            throw new RuntimeException("TODO");
        }

        // S8.
        return new Host.Domain(asciiDomain);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#concept-opaque-host-parser">
     *      Relevant section in URL specification</a>
     */
    private static Host opaqueHostParser(String input) throws YWSyntaxError {
        // S1.
        if (input.codePoints().anyMatch(i -> isForbiddenHostCodePoint(i))) {
            throw new YWSyntaxError();
        }

        // S2.
        // NOTE: S2 only does validation.

        // S3.
        // NOTE: S3 only does validation.

        // S4.
        return new Host.Domain(utf8PercentEncode(input, C0_CONTROL_PERCENT_ENCODE_SET));
    }

    private enum ParserState {
        SCHEME_START,
        SCHEME,
        NO_SCHEME,
        SPECIAL_RELATIVE_OR_AUTHORITY,
        PATH_OR_AUTHORITY,
        RELATIVE,
        RELATIVE_SLASH,
        SPECIAL_AUTHORITY_SLASHES,
        SPECIAL_AUTHORITY_IGNORE_SLASHES,
        AUTHORITY,
        HOST,
        HOSTNAME,
        PORT,
        FILE,
        FILE_SLASH,
        FILE_HOST,
        PATH_START,
        PATH,
        OPAQUE_PATH,
        QUERY,
        FRAGMENT,
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#windows-drive-letter">
     *      Relevant section in URL specification</a>
     */
    private static boolean isWindowsDriveLetter(String s) {
        return s.length() == 2 &&
                YWUtility.isAsciiAlpha(s.codePointAt(0)) &&
                (s.codePointAt(1) == ':' || s.codePointAt(1) == '|');
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#normalized-windows-drive-letter">
     *      Relevant section in URL specification</a>
     */
    private static boolean isNormalizedWindowsDriveLetter(String s) {
        return isWindowsDriveLetter(s) && s.codePointAt(1) == ':';
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#start-with-a-windows-drive-letter">
     *      Relevant section in URL specification</a>
     */
    private static boolean startsWithWindowsDriveLetter(String s) {
        return 2 <= s.length() &&
                isWindowsDriveLetter(s.substring(0, 2)) &&
                (2 == s.length() ||
                        s.codePointAt(2) == '/' ||
                        s.codePointAt(2) == '\\' ||
                        s.codePointAt(2) == '?' ||
                        s.codePointAt(2) == '#');
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#concept-basic-url-parser">
     *      Relevant section in URL specification</a>
     */
    private static YWURL basicURLParser(String input, YWURL base, YWEncoding encoding, YWURL url,
            ParserState stateOverride) throws YWSyntaxError {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.08.)

        // S1.
        if (url == null) {
            // S1-1.
            url = new YWURL();

            // S1-2.
            // NOTE: S1-2 only checks for validation error, and S1-3 fixes it when
            // encountered.

            // S1-3.
            while (!input.isEmpty() && YWUtility.isC0ControlCharacterOrSpace(input.codePointAt(0))) {
                input = input.substring(1);
            }
            while (!input.isEmpty() && YWUtility.isC0ControlCharacterOrSpace(input.length() - 1)) {
                input = input.substring(0, input.length() - 1);
            }
        }

        // S2.
        // NOTE: S2 only checks for validation error, and S3 fixes it when encountered.

        // S3.
        input = input.replace("\t", "").replace("\n", "");

        // S4.
        ParserState state = stateOverride != null ? stateOverride : ParserState.SCHEME_START;

        // S5.
        encoding = encoding.getOutputEncoding();

        // S6.
        StringBuilder buffer = new StringBuilder();

        // S7.
        boolean atSignSeen = false;
        boolean insideBrackets = false;
        boolean passwordTokenSeen = false;

        // S8.
        int pointer = 0;

        // S9.
        while (true) {
            final int EOF = -1;

            int c;
            String remaining;
            if (input.length() <= pointer) {
                c = -1;
                remaining = "";
            } else {
                c = input.codePointAt(pointer);
                remaining = input.substring(pointer + 1);
            }
            switch (state) {
                case SCHEME_START:
                    // S1.
                    if (YWUtility.isAsciiAlpha(c)) {
                        buffer.append(Character.toString(c).toLowerCase(Locale.ROOT));
                        state = ParserState.SCHEME;
                    }
                    // S2.
                    else if (stateOverride == null) {
                        state = ParserState.NO_SCHEME;
                        pointer--;
                    }
                    // S3.
                    else {
                        throw new YWSyntaxError();
                    }
                    break;
                case SCHEME:
                    // S1.
                    if (YWUtility.isAsciiAlphanumeric(c)) {
                        buffer.append(Character.toString(c).toLowerCase(Locale.ROOT));
                    }
                    // S2.
                    else if (c == ':') {
                        // S2-1.
                        if (stateOverride != null) {
                            // TODO: Implement S2-1-1 ~
                            throw new RuntimeException("TODO");
                        }

                        // S2-2.
                        url.scheme = buffer.toString();

                        // S2-3.
                        if (stateOverride != null) {
                            // TODO: Implement S2-3-1 ~
                            throw new RuntimeException("TODO");
                        }

                        // S2-4.
                        buffer.delete(0, buffer.length());

                        // S2-5.
                        if (url.scheme.equals("file")) {
                            // S2-5-1.
                            // NOTE: S2-5-1 only does validation.

                            // S2-5-2.
                            state = ParserState.FILE;
                        }

                        // S2-6.
                        else if (url.isSpecial() && base != null && base.scheme.equals(url.scheme)) {
                            // S2-6-1.
                            assert base.isSpecial();

                            // S2-6-2.
                            state = ParserState.SPECIAL_RELATIVE_OR_AUTHORITY;
                        }

                        // S2-7.
                        else if (url.isSpecial()) {
                            state = ParserState.SPECIAL_AUTHORITY_SLASHES;
                        }

                        // S2-8.
                        else if (remaining.startsWith("/")) {
                            state = ParserState.PATH_OR_AUTHORITY;
                            pointer++;
                        }

                        // S2-9.
                        else {
                            url.path = Arrays.asList("");
                            state = ParserState.OPAQUE_PATH;
                        }

                    }

                    // S3.
                    else if (stateOverride == null) {
                        buffer.delete(0, buffer.length());
                        state = ParserState.NO_SCHEME;
                        pointer = -1; // Start over
                    }

                    // S4.
                    else {
                        throw new YWSyntaxError();
                    }
                    break;
                case NO_SCHEME:
                    // TODO: Implement NO_SCHEME state
                    throw new RuntimeException("TODO");
                case SPECIAL_RELATIVE_OR_AUTHORITY:
                    // S1.
                    if (c == '/' && remaining.startsWith("/")) {
                        state = ParserState.SPECIAL_AUTHORITY_IGNORE_SLASHES;
                        pointer++;
                    }

                    // S2.
                    else {
                        // VALIDATION ERROR
                        state = ParserState.RELATIVE;
                        pointer--;
                    }
                    break;
                case PATH_OR_AUTHORITY:
                    // S1.
                    if (c == '/') {
                        state = ParserState.AUTHORITY;
                    }

                    // S2.
                    else {
                        state = ParserState.PATH;
                        pointer--;
                    }
                    break;
                case RELATIVE:
                    // S1.
                    assert !base.scheme.equals("file");

                    // S2.
                    url.scheme = base.scheme;

                    // S3.
                    if (c == '/') {
                        state = ParserState.RELATIVE_SLASH;
                    }

                    // S4.
                    else if (url.isSpecial() && c == '\\') {
                        // VALIDATION ERROR
                        state = ParserState.RELATIVE_SLASH;
                    }

                    // S5.
                    else {
                        // S5-1.
                        url.username = base.username;
                        url.password = base.password;
                        url.host = base.host;
                        url.port = base.port;
                        url.path = new ArrayList<>(base.path);
                        url.query = base.query;

                        // S5-2.
                        if (c == '?') {
                            url.query = "";
                            state = ParserState.QUERY;
                        }

                        // S5-3.
                        else if (c == '#') {
                            url.fragment = "";
                            state = ParserState.FRAGMENT;
                        }

                        // S5-4.
                        else if (c != EOF) {
                            // S5-4-1.
                            url.query = "";

                            // S5-4-2.
                            url.shortenPath();

                            // S5-4-3.
                            state = ParserState.PATH;
                            pointer--;
                        }
                    }
                    break;
                case RELATIVE_SLASH:
                    // S1.
                    if (url.isSpecial() && (c == '/' || c == '\\')) {
                        // S1-1.
                        // NOTE: S1-1 only does validation.

                        // S1-2.
                        state = ParserState.SPECIAL_AUTHORITY_IGNORE_SLASHES;
                    }

                    // S2.
                    else if (c == '/') {
                        state = ParserState.AUTHORITY;
                    }

                    // S3.
                    else {
                        url.username = base.username;
                        url.password = base.password;
                        url.host = base.host;
                        url.port = base.port;

                    }
                    break;
                case SPECIAL_AUTHORITY_SLASHES:
                    // S1.
                    if (c == '/' && remaining.startsWith("/")) {
                        state = ParserState.SPECIAL_AUTHORITY_IGNORE_SLASHES;
                        pointer++;
                    }

                    // S2.
                    else {
                        // VALIDATION ERROR
                        state = ParserState.SPECIAL_AUTHORITY_IGNORE_SLASHES;
                        pointer--;
                    }
                    break;
                case SPECIAL_AUTHORITY_IGNORE_SLASHES:
                    // S1.
                    if (c != '/' && c != '\\') {
                        state = ParserState.AUTHORITY;
                        pointer--;
                    }

                    // S2.
                    else {
                        // VALIDATION ERROR
                    }
                    break;
                case AUTHORITY:
                    // S1.
                    if (c == '@') {
                        // S1-1.
                        // VALIDATION ERROR

                        // S1-2.
                        if (atSignSeen) {
                            buffer.append("%40");
                        }

                        // S1-3.
                        atSignSeen = true;

                        // S1-4.
                        for (int codePoint : buffer.codePoints().toArray()) {
                            // S1-4-1.
                            if (codePoint == ':' && !passwordTokenSeen) {
                                passwordTokenSeen = true;
                                continue;
                            }
                            // S1-4-2.
                            String encodedCodePoints = utf8PercentEncode(codePoint, USERINFO_PERCENT_ENCODE_SET);

                            // S1-4-3.
                            if (passwordTokenSeen) {
                                url.password += encodedCodePoints;
                            }

                            // S1-4-4.
                            else {
                                url.username += encodedCodePoints;
                            }

                        }

                        // S1-5.
                        buffer.delete(0, buffer.length());
                    }

                    // S2.
                    else if (c == EOF || c == '/' || c == '#' || (url.isSpecial() && c == '\\')) {
                        // S2-1.
                        if (atSignSeen && buffer.isEmpty()) {
                            // VALIDATION ERROR
                            throw new YWSyntaxError();
                        }

                        // S2-2.
                        pointer -= buffer.length() + 1;
                        buffer.delete(0, buffer.length());
                        state = ParserState.HOST;
                    }

                    break;
                case HOST:
                case HOSTNAME:
                    // S1.
                    if (stateOverride != null && url.scheme.equals("file")) {
                        pointer--;
                        state = ParserState.FILE_HOST;
                    }

                    // S2.
                    else if (c == ':' && !insideBrackets) {
                        // S2-1.
                        if (buffer.isEmpty()) {
                            // VALIDATION ERROR
                            throw new YWSyntaxError();
                        }

                        // S2-2.
                        if (stateOverride != null && stateOverride == ParserState.HOSTNAME) {
                            throw new YWSyntaxError();
                        }

                        Host host;
                        try {
                            // S2-3.
                            host = hostParser(buffer.toString(), !url.isSpecial());
                        } catch (YWSyntaxError e) {
                            // S2-4.
                            throw e;
                        }

                        // S2-5.
                        url.host = host;
                        buffer.delete(0, buffer.length());
                        state = ParserState.PORT;
                    }

                    // S3.
                    else if (c == EOF || c == '/' || c == '#' || (url.isSpecial() && c == '\\')) {
                        pointer--;

                        // S3-1.
                        if (url.isSpecial() && buffer.isEmpty()) {
                            // VALIDATION ERROR
                            throw new YWSyntaxError();
                        }

                        // S3-2.
                        else if (stateOverride != null && buffer.isEmpty()
                                && (url.includesCredentials() || url.port != null)) {
                            throw new YWSyntaxError();
                        }

                        Host host;
                        try {
                            // S3-3.
                            host = hostParser(buffer.toString(), !url.isSpecial());
                        } catch (YWSyntaxError e) {
                            // S3-4.
                            throw e;
                        }

                        // S3-5.
                        url.host = host;
                        buffer.delete(0, buffer.length());
                        state = ParserState.PATH_START;

                        // S3-6.
                        if (stateOverride != null) {
                            return url;
                        }
                    }

                    // S4.
                    else {
                        // S4-1.
                        if (c == '[') {
                            insideBrackets = true;
                        }

                        // S4-2.
                        else if (c == ']') {
                            insideBrackets = false;
                        }

                        // S4-3.
                        buffer.appendCodePoint(c);
                    }
                    break;
                case PORT:
                    // S1.
                    if (YWUtility.isAsciiDigit(c)) {
                        buffer.appendCodePoint(c);
                    }

                    // S2.
                    else if (c == EOF || c == '/' || c == '#' || (url.isSpecial() && c == '\\')) {
                        // S2-1.
                        if (!buffer.isEmpty()) {
                            // S2-1-1.
                            Integer port = Integer.parseInt(buffer.toString());

                            // S2-1-2.
                            if (port < 0 || 65535 < port) {
                                // VALIDATION ERROR
                                throw new YWSyntaxError();
                            }

                            // S2-1-3.
                            url.port = port.equals(defaultPortFor(url.scheme)) ? null : port;

                            // S2-1-4.
                            buffer.delete(0, buffer.length());

                            // S2-1-5.
                            if (stateOverride != null) {
                                return url;
                            }
                        }

                        // S2-2.
                        if (stateOverride != null) {
                            throw new YWSyntaxError();
                        }

                        // S2-3.
                        state = ParserState.PATH_START;
                        pointer--;
                    }

                    // S3.
                    else {
                        // VALIDATION ERROR
                        throw new YWSyntaxError();
                    }
                    break;
                case FILE:
                    // S1.
                    url.scheme = "file";

                    // S2.
                    url.host = new Host.Empty();

                    // S3.
                    if (c == '/' || c == '\\') {
                        // S3-1.
                        // S3-1 only does validation.

                        // S3-2.
                        state = ParserState.FILE_SLASH;
                    }

                    // S4.
                    else if (base != null && base.scheme.equals("file")) {
                        // S4-1.
                        url.host = base.host;
                        url.path = new ArrayList<>(base.path);
                        url.query = base.query;

                        // S4-2.
                        if (c == '?') {
                            url.query = "";
                            state = ParserState.QUERY;
                        }

                        // S4-3.
                        else if (c == '#') {
                            url.fragment = "";
                            state = ParserState.FRAGMENT;
                        }

                        // S4-4.
                        else if (c != EOF) {
                            // S4-4-1.
                            url.query = "";

                            // S4-4-2.
                            if (!startsWithWindowsDriveLetter(input.substring(pointer))) {
                                url.shortenPath();
                            }

                            // S4-4-3.
                            else {
                                // S1.
                                // VALIDATION ERROR

                                // S2.
                                url.path.clear();
                            }

                            // S4-4-4.
                            state = ParserState.PATH;
                            pointer--;
                        }

                        // S5
                        else {
                            state = ParserState.PATH;
                            pointer--;
                        }
                    }
                    break;
                case FILE_SLASH:
                    // S1.
                    if (c == '/' || c == '\\') {
                        // S1-1.
                        // NOTE: S1-1 only does validation.

                        // S1-2.
                        state = ParserState.FILE_HOST;
                    }

                    // S2.
                    else {
                        // S2-1.
                        if (base != null && base.scheme.equals("file")) {
                            // S2-1-1.
                            url.host = base.host;

                            // S2-1-2.
                            if (!startsWithWindowsDriveLetter(input.substring(pointer))
                                    && isNormalizedWindowsDriveLetter(base.path.get(0))) {
                                url.path.add(base.path.get(0));
                            }
                        }
                        // S2-2.
                        state = ParserState.PATH;
                        pointer--;
                    }
                    break;
                case FILE_HOST:
                    // S1.
                    if (c == EOF || c == '/' || c == '\\' || c == '?' || c == '#') {
                        pointer--;

                        // S1-1.
                        if (stateOverride == null && isWindowsDriveLetter(buffer.toString())) {
                            // VALIDATION ERROR
                            state = ParserState.PATH;
                        }

                        // S1-2.
                        else if (!buffer.isEmpty()) {
                            // S1-2-1.
                            url.host = new Host.Empty();

                            // S1-2-2.
                            if (stateOverride != null) {
                                return url;
                            }

                            // S1-2-3.
                            state = ParserState.PATH;
                        }

                        // S1-3.
                        else {
                            Host host;
                            try {
                                // S1-3-1.
                                host = hostParser(buffer.toString(), !url.isSpecial());
                            } catch (YWSyntaxError e) {
                                // S1-3-2.
                                throw e;
                            }

                            // S1-3-3.
                            if (host instanceof Host.Domain domainHost && domainHost.domain.equals("localhost")) {
                                host = new Host.Empty();
                            }

                            // S1-3-4.
                            url.host = host;

                            // S1-3-5.
                            if (stateOverride != null) {
                                return url;
                            }

                            // S1-3-6.
                            buffer.delete(0, buffer.length());
                            state = ParserState.PATH_START;
                        }
                    }

                    // S2.
                    else {
                        buffer.appendCodePoint(c);
                    }
                case PATH_START:
                    // S1.
                    if (url.isSpecial()) {
                        // S1-1.
                        // NOTE: S1-1 only does validation.

                        // S1-2.
                        state = ParserState.PATH;

                        // S1-3.
                        if (c != '/' && c != '\\') {
                            pointer--;
                        }
                    }

                    // S2.
                    else if (stateOverride == null && c == '?') {
                        url.query = "";
                        state = ParserState.QUERY;
                    }

                    // S3.
                    else if (stateOverride == null && c == '#') {
                        url.fragment = "";
                        state = ParserState.FRAGMENT;
                    }

                    // S4.
                    else if (c != EOF) {
                        state = ParserState.PATH;
                        if (c != '/') {
                            pointer--;
                        }
                    }

                    // S5.
                    else if (stateOverride != null && url.host == null) {
                        url.path.add("");
                    }
                    break;
                case PATH:
                    // S1.
                    if (c == EOF || c == '/' || (url.isSpecial() && c == '\\')
                            || (stateOverride == null && (c == '?' || c == '#'))) {
                        // S1-1.
                        // NOTE: S1-1 only does validation.

                        // S1-2.
                        if (isDoubleDotURLPathSegment(buffer.toString())) {
                            // S1-2-1.
                            url.shortenPath();

                            // S1-2-2.
                            if (c != '/' && (!url.isSpecial() || c != '\\')) {
                                url.path.add("");
                            }
                        }

                        // S1-3.
                        else if (isSingleDotURLPathSegment(buffer.toString()) && c != '/'
                                && (!url.isSpecial() || c != '\\')) {
                            url.path.add("");
                        }

                        // S1-4.
                        else if (!isSingleDotURLPathSegment(buffer.toString())) {
                            // S1-4-1.
                            if (url.scheme.equals("file") && url.path.size() == 0
                                    && isWindowsDriveLetter(buffer.toString())) {
                                buffer.replace(1, 1, ":");
                            }

                            // S1-4-2.
                            url.path.add(buffer.toString());
                        }

                        // S1-5.
                        buffer.delete(0, buffer.length());

                        // S1-6.
                        if (c == '?') {
                            url.query = "";
                            state = ParserState.QUERY;
                        }

                        // S1-7.
                        if (c == '#') {
                            url.fragment = "";
                            state = ParserState.FRAGMENT;
                        }
                    }

                    // S2.
                    else {
                        // S2-1.
                        // NOTE: S2-1 only does validation.

                        // S2-2.
                        // NOTE: S2-2 only does validation.

                        // S2-3.
                        buffer.append(utf8PercentEncode(c, PATH_PERCENT_ENCODE_SET));
                    }
                    break;

                case OPAQUE_PATH:
                    // S1.
                    if (c == '?') {
                        url.query = "";
                        state = ParserState.QUERY;
                    }

                    // S2.
                    else if (c == '#') {
                        url.fragment = "";
                        state = ParserState.FRAGMENT;
                    }

                    // S3.
                    else if (c == ' ') {
                        // S3-1.
                        if (remaining.startsWith("?") || remaining.startsWith("#")) {
                            url.path.add("%20");
                        }

                        // S3-2.
                        else {
                            url.path.add(" ");
                        }
                    }

                    // S4.
                    else if (c != EOF) {
                        // S4-1.
                        // NOTE: S4-1 only does validation.

                        // S4-2.
                        // NOTE: S4-2 only does validation.

                        // S4-3.
                        url.path.add(utf8PercentEncode(c, C0_CONTROL_PERCENT_ENCODE_SET));
                    }
                    break;
                case QUERY:
                    // S1.
                    if (encoding != YWEncoding.UTF8
                            && (!url.isSpecial() || url.scheme.equals("ws") || url.scheme.equals("wss"))) {
                        encoding = YWEncoding.UTF8;
                    }

                    // S2.
                    if ((stateOverride == null && c == '#') || c == EOF) {
                        // S2-1.
                        Function<Integer, Boolean> queryPercentEncodeSet = url.isSpecial()
                                ? SPECIAL_QUERY_PERCENT_ENCODE_SET
                                : QUERY_PERCENT_ENCODE_SET;

                        // S2-2.
                        url.query += percentEncodeAfterEncoding(encoding, buffer.toString(), queryPercentEncodeSet);

                        // S2-3.
                        buffer.delete(0, buffer.length());

                        // S2-4.
                        if (c == '#') {
                            url.fragment = "";
                            state = ParserState.FRAGMENT;
                        }
                    }

                    // S3.
                    else if (c != EOF) {
                        // S3-1.
                        // NOTE: S3-1 only does validation.

                        // S3-2.
                        // NOTE: S3-2 only does validation.

                        // S3-3.
                        buffer.appendCodePoint(c);
                    }
                case FRAGMENT:
                    // S1.
                    if (c != EOF) {
                        // S1-1.
                        // NOTE: S1-1 only does validation.

                        // S1-2.
                        // NOTE: S1-2 only does validation.

                        // S1-3.
                        url.fragment += utf8PercentEncode(c, FRAGMENT_PERCENT_ENCODE_SET);
                    }
                    break;
            }

            if (input.length() <= pointer) {
                break;
            }
            pointer++;
        }

        // S10.
        return url;
    }

    private static YWURL basicURLParser(String input, YWURL base, YWEncoding encoding, YWURL url) throws YWSyntaxError {
        return basicURLParser(input, base, encoding, url, null);
    }

    private static YWURL basicURLParser(String input, YWURL base, YWEncoding encoding) throws YWSyntaxError {
        return basicURLParser(input, base, encoding, null);
    }

    private static YWURL basicURLParser(String input, YWURL base) throws YWSyntaxError {
        return basicURLParser(input, base, YWEncoding.UTF8);
    }

    private static YWURL basicURLParser(String input) throws YWSyntaxError {
        return basicURLParser(input, null);
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#url-opaque-path">
     *      Relevant section in URL specification</a>
     */
    public boolean hasOpaquePath() {
        return !isSpecial() && path.size() == 1 && !path.get(0).isEmpty();
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#shorten-a-urls-path">
     *      Relevant section in URL specification</a>
     */
    private void shortenPath() {

    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#is-special">
     *      Relevant section in URL specification</a>
     */
    private boolean isSpecial() {
        switch (scheme) {
            case "ftp":
            case "file":
            case "http":
            case "https":
            case "ws":
            case "wss":
                return true;
            default:
                return false;
        }
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#default-port">
     *      Relevant section in URL specification</a>
     */
    private static Integer defaultPortFor(String scheme) {
        switch (scheme) {
            case "ftp":
                return 21;
            case "file":
                return null;
            case "http":
                return 80;
            case "https":
                return 443;
            case "ws":
                return 80;
            case "wss":
                return 443;
            default:
                return null;
        }
    }

    /**
     * @see <a href=
     *      "https://url.spec.whatwg.org/#include-credentials">
     *      Relevant section in URL specification</a>
     */
    private boolean includesCredentials() {
        return !username.isEmpty() || !password.isEmpty();
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#matches-about:blank">
     *      Relevant section in HTML specification</a>
     */
    public boolean matchesAboutBlank() {
        return scheme.equals("about") && path.size() == 1 && path.get(0).equals("blank") &&
                username.isEmpty() && password.isEmpty() && host == null;
    }

    public String getScheme() {
        return scheme;
    }

    public void setScheme(String scheme) {
        this.scheme = scheme;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Host getHost() {
        return host;
    }

    public void setHost(Host host) {
        this.host = host;
    }

    public Integer getPort() {
        return port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public List<String> getPath() {
        return path;
    }

    public void setPath(List<String> path) {
        this.path = path;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getFragment() {
        return fragment;
    }

    public void setFragment(String fragment) {
        this.fragment = fragment;
    }

    public Object getBlobURLEntry() {
        return blobURLEntry;
    }

    public void setBlobURLEntry(Object blobURLEntry) {
        this.blobURLEntry = blobURLEntry;
    }

}
