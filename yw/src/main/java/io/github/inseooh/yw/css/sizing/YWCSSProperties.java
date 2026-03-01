package io.github.inseooh.yw.css.sizing;

import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "width", type = YWCSSSize.SizeOrAuto.class)
    public static class Width {
        public static YWCSSSize getInitialValue() {
            return YWCSSSize.AUTO;
        }
    }
    @YWCSSSimpleProperty(name = "height", type = YWCSSSize.SizeOrAuto.class)
    public static class Height {
        public static YWCSSSize getInitialValue() {
            return YWCSSSize.AUTO;
        }
    }
}
