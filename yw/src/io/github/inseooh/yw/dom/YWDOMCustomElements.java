package io.github.inseooh.yw.dom;

import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;

public class YWDOMCustomElements {
    /**
     * Reports whether registry is a global custom element registry.
     * @param registry Custom element registry or null
     * @return true if registry is a global custom element registry.
     *
     * @see <a href="https://dom.spec.whatwg.org/#is-a-global-custom-element-registry">Relevant section in DOM specification</a>
     */
    public static boolean isGlobalCustomElementRegistry(YWCustomElementRegistry registry) {
        return registry != null && !registry.isScoped();
    }
}
