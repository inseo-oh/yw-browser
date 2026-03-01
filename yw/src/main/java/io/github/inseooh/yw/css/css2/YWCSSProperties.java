package io.github.inseooh.yw.css.css2;

import io.github.inseooh.ywsupport.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "float", type = YWCSSFloat.class)
    public static class Float {
        public static YWCSSFloat getInitialValue() {
            return YWCSSFloat.NONE;
        }
    }
}
