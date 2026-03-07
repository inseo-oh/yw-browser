package io.github.inseooh.yw.css.om;

import java.util.ArrayList;
import java.util.List;

public record YWCSSStyleSheetSet(List<YWCSSStyleSheet> list) {
    public YWCSSStyleSheetSet() {
        this(new ArrayList<>());
    }

    public String name() {
        return list.get(0).getTitle();
    }
}
