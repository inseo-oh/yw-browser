package io.github.inseooh.yw.html.fetch;

import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.html.YWEnumeratedAttributes;

/**
 * Represents CORS settings attribute.
 *
 * @see <a href="https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attribute">Relevant section in HTML specification</a>
 */
public enum YWCORSSettings {
    NO_CORS, ANONYMOUS, USE_CREDENTIALS;

    public static YWCORSSettings fromAttribute(YWElement element, String attrName) {
        return YWEnumeratedAttributes.fromAttribute(element, attrName, NO_CORS, ANONYMOUS, ANONYMOUS, (attr) -> {
            switch (attr) {
                case "anonymous":
                    return ANONYMOUS;
                case "use-credentials":
                    return USE_CREDENTIALS;
                default:
                    return null;
            }
        });
    }
}
