package io.github.inseooh.yw.dom;

import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;

public class YWShadowRoot extends YWDocumentFragment {
    private YWCustomElementRegistry customElementRegistry = null;

    YWShadowRoot(YWDocument nodeDocument, YWNode host) {
        super(nodeDocument, host);
    }

    public YWCustomElementRegistry getCustomElementRegistry() {
        return customElementRegistry;
    }

    public void setCustomElementRegistry(YWCustomElementRegistry customElementRegistry) {
        this.customElementRegistry = customElementRegistry;
    }
}
