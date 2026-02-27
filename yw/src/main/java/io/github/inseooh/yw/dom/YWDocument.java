package io.github.inseooh.yw.dom;

import io.github.inseooh.yw.html.customelements.YWCustomElementRegistry;

public class YWDocument extends YWNode {
    /**
     * Represents document's mode.
     *
     * @see <a href="https://dom.spec.whatwg.org/#concept-document-mode">Relevant section in DOM specification</a>
     */
    public enum Mode {
        NO_QUIRKS, QUIRKS, LIMITED_QUIRKS
    }

    private Origin origin = new Origin(); /* STUB */
    private EnvironmentSettings environmentSettings = new EnvironmentSettings(); /* STUB */
    private PolicyContainer policyContainer = new PolicyContainer(); /* STUB */

    private Mode mode = Mode.NO_QUIRKS;
    private YWCustomElementRegistry customElementRegistry = new YWCustomElementRegistry();

    private boolean iframeSrcdocDocument = false;
    private boolean parserCannotChangeMode = false;

    YWDocument() {
        super(null);
        this.setNodeDocument(this);
    }

    public String getBaseURL() {
        /* STUB */
        return "";
    }

    @Override
    void runInsertionSteps() {
    }

    @Override
    void runChildrenChangedSteps() {
    }

    @Override
    void runPostConnectionSteps() {
    }

    @Override
    void runAdoptingSteps(YWDocument oldDocument) {
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

    public PolicyContainer getPolicyContainer() {
        return policyContainer;
    }

    public void setPolicyContainer(PolicyContainer policyContainer) {
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
     * @return Effective global custom element registry, or null if not applicable.
     */
    public YWCustomElementRegistry getEffectiveGlobalCustomElementRegistry() {
        if (YWDOMCustomElements.isGlobalCustomElementRegistry(customElementRegistry)) {
            return customElementRegistry;
        }
        return null;
    }

    /* STUB types */
    public static class Origin {
    }

    public static class EnvironmentSettings {
    }

    public static class PolicyContainer {
    }

}
