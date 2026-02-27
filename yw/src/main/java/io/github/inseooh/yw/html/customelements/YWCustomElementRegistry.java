package io.github.inseooh.yw.html.customelements;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.dom.YWDocument;

public class YWCustomElementRegistry {
    private boolean isScoped = false;
    private List<YWDocument> scopedDocumentSet = new ArrayList<>();

    public boolean isScoped() {
        return isScoped;
    }

    public void setScoped(boolean scoped) {
        isScoped = scoped;
    }

    public List<YWDocument> getScopedDocumentSet() {
        return scopedDocumentSet;
    }

    public void setScopedDocumentSet(List<YWDocument> scopedDocumentSet) {
        this.scopedDocumentSet = scopedDocumentSet;
    }

    /**
     * Looks up custom element definition.
     *
     * @param namespace Namespace of element or null
     * @param localName Local name of element
     * @param is        Is value of element or null
     * @return A custom element definition, or null if not found.
     * @see <a href="https://html.spec.whatwg.org/multipage/custom-elements.html#look-up-a-custom-element-definition">Relevant section in HTML specification</a>
     */
    public YWCustomElementDefinition lookupCustomElementDefinition(String namespace, String localName, String is) {
        return null;
    }
}
