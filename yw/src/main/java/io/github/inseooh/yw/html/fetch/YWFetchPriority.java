package io.github.inseooh.yw.html.fetch;

import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.html.YWEnumeratedAttributes;

/**
 * Represents fetch priority attribute.
 *
 * @see <a href="https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fetch-priority-attribute">Relevant section in HTML specification</a>
 */
public enum YWFetchPriority {
    HIGH, LOW, AUTO;

    public static YWFetchPriority fromAttribute(YWElement element, String attrName) {
        return YWEnumeratedAttributes.fromAttribute(element, attrName, AUTO, null, AUTO, (attr) -> {
            switch (attr) {
                case "high":
                    return HIGH;
                case "low":
                    return LOW;
                case "auto":
                    return AUTO;
                default:
                    return null;
            }
        });
    }
}
