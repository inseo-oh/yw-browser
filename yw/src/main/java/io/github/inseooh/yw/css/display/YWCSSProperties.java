package io.github.inseooh.yw.css.display;

import io.github.inseooh.ywapt.YWCSSSimpleProperty;

public class YWCSSProperties {
    @YWCSSSimpleProperty(name = "display", type = YWCSSDisplay.class)
    public static class Width {
        public static YWCSSDisplay getInitialValue() {
            return new YWCSSDisplay(YWCSSDisplay.OuterMode.INLINE, YWCSSDisplay.InnerMode.FLOW);
        }
    }
}
