package io.github.inseooh.yw.dom;

import java.util.List;

import io.github.inseooh.yw.css.om.YWCSSStyleSheet;

public interface YWDocumentOrShadowRoot {
    public List<YWCSSStyleSheet> getStyleSheets();
}
