package io.github.inseooh.yw.dom;

import io.github.inseooh.yw.YWNamespaces;
import io.github.inseooh.yw.encoding.YWEncoding;
import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;
import io.github.inseooh.yw.url.YWURL;

public class YWDocument extends YWNode {

    /**
     * Represents document's type.
     *
     * @see <a href=
     *      "https://dom.spec.whatwg.org/#concept-document-type">
     *      Relevant section in DOM specification</a>
     */
    public enum Type {
        XML, HTML
    };

    /**
     * Represents document's mode.
     *
     * @see <a href=
     *      "https://dom.spec.whatwg.org/#concept-document-mode">
     *      Relevant section in DOM specification</a>
     */
    public enum Mode {
        NO_QUIRKS, QUIRKS, LIMITED_QUIRKS
    }

    private EnvironmentSettings environmentSettings = new EnvironmentSettings(); /* STUB */
    private String policyContainer = ""; /* STUB */

    private YWEncoding encoding = YWEncoding.UTF8;
    private String contentType = "application/xml";
    private YWURL url = YWURL.urlParserFromLiteral("about:blank");
    private Origin origin = new Origin(); /* STUB */
    private Type type = Type.XML;
    private Mode mode = Mode.NO_QUIRKS;
    private boolean allowDeclarativeShadowRoots = false;
    private YWCustomElementRegistry customElementRegistry = null;

    private boolean iframeSrcdocDocument = false;
    private boolean parserCannotChangeMode = false;
    private YWURL aboutBaseURL = null;

    YWDocument() {
        super(null);
        this.setNodeDocument(this);
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-url">
     *      Relevant section in HTML specification</a>
     */
    public YWURL getDocumentBaseURL() {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.07.)

        // S1.
        YWElement baseElement = null;
        for (YWNode n : getDescendants()) {
            if (n instanceof YWElement elem && elem.isElement(YWNamespaces.HTML, "base")
                    && elem.getAttr("href") != null) {
                baseElement = elem;
            }
        }
        if (baseElement == null) {
            return getFallbackBaseURL();
        }

        // S2.
        // TODO: Return the frozen base URL of the first base element in document that
        // has an href attribute, in tree order.

        throw new RuntimeException("TODO");
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#fallback-base-url">
     *      Relevant section in HTML specification</a>
     */
    public YWURL getFallbackBaseURL() {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.07.)

        // S1.
        if (isIframeSrcdocDocument()) {
            // S1-1.
            assert aboutBaseURL != null;

            // S1-2.
            return aboutBaseURL;
        }

        // S2.
        if (url.matchesAboutBlank() && aboutBaseURL != null) {
            return aboutBaseURL;
        }

        // S3.
        return url;
    }

    @Override
    public void runInsertionSteps() {
    }

    @Override
    public void runChildrenChangedSteps() {
    }

    @Override
    public void runPostConnectionSteps() {
    }

    @Override
    public void runAdoptingSteps(YWDocument oldDocument) {
    }

    public Origin getOrigin() {
        return origin;
    }

    public void setOrigin(Origin origin) {
        this.origin = origin;
    }

    public EnvironmentSettings getEnvironmentSettings() {
        return environmentSettings;
    }

    public void setEnvironmentSettings(EnvironmentSettings environmentSettings) {
        this.environmentSettings = environmentSettings;
    }

    public String getPolicyContainer() {
        return policyContainer;
    }

    public void setPolicyContainer(String policyContainer) {
        this.policyContainer = policyContainer;
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

    public YWCustomElementRegistry getCustomElementRegistry() {
        return customElementRegistry;
    }

    public void setCustomElementRegistry(YWCustomElementRegistry customElementRegistry) {
        this.customElementRegistry = customElementRegistry;
    }

    public boolean isIframeSrcdocDocument() {
        return iframeSrcdocDocument;
    }

    public void setIframeSrcdocDocument(boolean iframeSrcdocDocument) {
        this.iframeSrcdocDocument = iframeSrcdocDocument;
    }

    public boolean isParserCannotChangeMode() {
        return parserCannotChangeMode;
    }

    public void setParserCannotChangeMode(boolean parserCannotChangeMode) {
        this.parserCannotChangeMode = parserCannotChangeMode;
    }

    /**
     * Returns effective global custom element registry.
     * 
     * @return Effective global custom element registry, or null if not applicable.
     */
    public YWCustomElementRegistry getEffectiveGlobalCustomElementRegistry() {
        if (YWDOMCustomElements.isGlobalCustomElementRegistry(customElementRegistry)) {
            return customElementRegistry;
        }
        return null;
    }

    public YWURL getAboutBaseURL() {
        return aboutBaseURL;
    }

    public void setAboutBaseURL(YWURL aboutBaseURL) {
        this.aboutBaseURL = aboutBaseURL;
    }

    public YWEncoding getEncoding() {
        return encoding;
    }

    public void setEncoding(YWEncoding encoding) {
        this.encoding = encoding;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public YWURL getUrl() {
        return url;
    }

    public void setUrl(YWURL url) {
        this.url = url;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public boolean isAllowDeclarativeShadowRoots() {
        return allowDeclarativeShadowRoots;
    }

    public void setAllowDeclarativeShadowRoots(boolean allowDeclarativeShadowRoots) {
        this.allowDeclarativeShadowRoots = allowDeclarativeShadowRoots;
    }

    /* STUB types */
    public static class Origin {
    }

    public static class EnvironmentSettings {
    }

}
