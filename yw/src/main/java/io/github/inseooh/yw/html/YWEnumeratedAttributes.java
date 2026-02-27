package io.github.inseooh.yw.html;

import java.util.Locale;

import io.github.inseooh.yw.dom.YWElement;

public class YWEnumeratedAttributes {
    @FunctionalInterface
    public interface Matcher<T> {
        T tryMatch(String value);
    }

    /**
     * Returns a enumerated attribute value using given attribute.
     *
     * @param element             Element to get attribute from.
     * @param attrName            Name of attribute.
     * @param missingValueDefault "missing value default" state, or null if not applicable.
     * @param emptyValueDefault   "empty value default" state, or null if not applicable.
     * @param invalidValueDefault "invalid value default" state, or null if not applicable.
     * @param <T>                 Type of the return value.
     * @return One of values for the enumerated attribute, or null for no state.
     * @see <a href="https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#enumerated-attribute">Relevant section in HTML specification</a>
     */
    public static <T> T fromAttribute(YWElement element, String attrName, T missingValueDefault, T emptyValueDefault, T invalidValueDefault, Matcher<T> matcher) {
        // NOTE: All the step numbers(S#.) are based on spec from when this was initially written(2026.02.05)

        // S1 --------------------------------------------------------------------------------------
        String attrValue = element.getAttr(attrName);
        if (attrValue == null) {
            // S1-1, S1-2 --------------------------------------------------------------------------
            return missingValueDefault;
        }
        // S2 --------------------------------------------------------------------------------------
        T res = matcher.tryMatch(attrValue.toLowerCase(Locale.ROOT));
        if (res != null) {
            return res;
        }
        // S3 --------------------------------------------------------------------------------------
        if (emptyValueDefault != null && attrValue.isEmpty()) {
            return emptyValueDefault;
        }
        // S4, S5 ----------------------------------------------------------------------------------
        return invalidValueDefault;
    }
}
