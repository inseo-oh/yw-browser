package io.github.inseooh.yw.html;

import java.util.Locale;
import java.util.function.Consumer;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.css.om.YWCSSStyleSheet;
import io.github.inseooh.yw.css.om.YWCSSStyleSheetSetManager;
import io.github.inseooh.yw.css.syntax.YWCSSParser;
import io.github.inseooh.yw.dom.YWDocument;
import io.github.inseooh.yw.fetch.YWFetchRequest;
import io.github.inseooh.yw.fetch.YWFetchResponse;
import io.github.inseooh.yw.html.fetch.YWCORSSettings;
import io.github.inseooh.yw.url.YWURL;

public class YWHTMLLinkElement extends YWHTMLElement {
    // https://html.spec.whatwg.org/multipage/images.html#source-set
    private Object sourceSet = null; // STUB

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/semantics.html#explicitly-enabled">
     *      Relevant section in HTML specification</a>
     */
    private boolean explicitlyEnabled = false;

    YWHTMLLinkElement(YWDocument nodeDocument, String namespace, String namespacePrefix, String is, String localName,
            Object tagToken, CustomElementState customElementState) {
        super(nodeDocument, namespace, namespacePrefix, is, localName, tagToken, customElementState);
    }

    // HTML Spec defines precisely when link element should be processed, but this
    // will do the job for now.
    // (e.g. https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet)

    @Override
    public void poppedFromStackOfOpenElements() {
        super.poppedFromStackOfOpenElements();
        processLink();
    }

    public interface LinkType {
        /**
         * @see <a href=
         *      "https://html.spec.whatwg.org/multipage/semantics.html#fetch-and-process-the-linked-resource">
         *      Relevant section in HTML specification</a>
         */
        default void fetchAndProcessLinkedResource(YWHTMLLinkElement el) {
            // NOTE: All the step numbers(S#.) are based on spec from when this was
            // initially written(2026.03.11.)

            // S1.
            LinkProcessingOptions options = el.createLinkOptions();

            // S2.
            YWFetchRequest request = options.createLinkRequest();

            // S3.
            if (request == null) {
                return;
            }

            // S4.
            // XXX: Spec says to set synchronous flag of request, but there's no such flag?

            // S5.
            linkedResourceFetchSetupSteps(el, request);

            // S6.
            request.setInitiatorType(
                    el.getAttr("rel").toLowerCase(Locale.ROOT).equals("stylesheet") ? YWFetchRequest.InitiatorType.CSS
                            : YWFetchRequest.InitiatorType.LINK);

            // S7.
            request.fetch(new YWFetchRequest.FetchCallbacks() {
                @Override
                public void processResponseConsumeBody(YWFetchResponse response, boolean isFailure, byte[] bodyBytes) {
                    // S7-1.
                    boolean success = true;

                    // S7-2.
                    if (bodyBytes == null || isFailure || !YWFetchResponse.isOKStatus(response.getStatus())) {
                        success = false;
                    }

                    // S7-3.
                    // NOTE: We fetch all resources synchronously, so there's no need to wait.

                    // S7-4.
                    processLinkedResource(el, success, response, bodyBytes);

                }
            });
        }

        /**
         * @see <a href=
         *      "https://html.spec.whatwg.org/multipage/semantics.html#linked-resource-fetch-setup-steps">
         *      Relevant section in HTML specification</a>
         */
        default boolean linkedResourceFetchSetupSteps(YWHTMLLinkElement el, YWFetchRequest request) {
            return true;
        }

        /**
         * @see <a href=
         *      "https://html.spec.whatwg.org/multipage/semantics.html#process-the-linked-resource">
         *      Relevant section in HTML specification</a>
         */
        default void processLinkedResource(YWHTMLLinkElement el, boolean success, YWFetchResponse response,
                byte[] responseBytes) {
        }

        /*
         * https://html.spec.whatwg.org/multipage/semantics.html#process-a-link-header
         */
        void processLinkHeader(LinkProcessingOptions options);
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet">
     *      Relevant section in HTML specification</a>
     */
    private static final LinkType LINK_TYPE_STYLESHEET = new LinkType() {
        @Override
        public boolean linkedResourceFetchSetupSteps(YWHTMLLinkElement el, YWFetchRequest request) {
            // TODO: Implement linkedResourceFetchSetupSteps for stylesheet
            return true;
        }

        @Override
        public void processLinkedResource(YWHTMLLinkElement el, boolean success, YWFetchResponse response,
                byte[] responseBytes) {
            // NOTE: All the step numbers(S#.) are based on spec from when this was
            // initially written(2026.03.12.)

            // S1.
            // TODO: Implement S1.

            // S2.
            // TODO: Implement S2.

            // S3.
            if (YWCSSStyleSheetSetManager.getAssociatedCSSStyleSheet(el) != null) {
                YWCSSStyleSheetSetManager.removeCSSStyleSheet(YWCSSStyleSheetSetManager.getAssociatedCSSStyleSheet(el));
            }

            // S4.
            if (success) {
                // S4-1.
                YWCSSStyleSheet sheet = YWCSSParser
                        .parseCSSStyleSheet(YWCSSParser.newStyleSheetInput(el.getChildTextContent()), null);
                sheet.setType("text/css");
                if (!response.getURLList().isEmpty()) {
                    sheet.setLocation(response.getURLList().get(0).toString());
                }
                sheet.setMedia(el.getAttr("media"));
                sheet.setTitle(el.getAttr("title") != null ? el.getAttr("title") : "");
                sheet.setAlternateFlag(el.isAlternativeStyleSheet() && !el.explicitlyEnabled);
                sheet.setOriginCleanFlag(response.isCORSSameOrigin());
                sheet.setParentStyleSheet(null);
                sheet.setOwnerCSSRule(null);

                // S4-2.
                // TODO: Implement S4-2.
            }

            // S5.
            else {
                // TODO: Implement S5.
                throw new RuntimeException("TODO");
            }

            // S6.
            if (el.contributesScriptBlockingStylesheet()) {
                // TODO: Implement S6.
                throw new RuntimeException("TODO");
            }

            // S7.
            // TODO: Implement S7.
        };

        @Override
        public void processLinkHeader(LinkProcessingOptions options) {

        }
    };

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/semantics.html#link-processing-options">
     *      Relevant section in HTML specification</a>
     */
    private static class LinkProcessingOptions {
        private String href = "";
        private String initiator = "link";
        private String integrity = "";
        private String tp = "";
        private String cryptographicNonceMetadata = "";
        private String destination = "";
        private YWCORSSettings crossorigin = YWCORSSettings.NO_CORS;
        private String referrerPolicy = "";
        private Object sourceSet = null;
        private YWURL baseURL; // <STUB
        private Object origin; // <STUB
        private Object environment;// <STUB
        private String policyContainer; // <STUB
        private YWDocument document = null;
        private Consumer<YWDocument> onDocumentReady = null;
        private YWFetchRequest.Priority fetchPriority = YWFetchRequest.Priority.AUTO;

        public LinkProcessingOptions(YWURL baseURL, Object origin, Object environment, String policyContainer) {
            this.baseURL = baseURL;
            this.origin = origin;
            this.environment = environment;
            this.policyContainer = policyContainer;
        }

        /**
         * @see <a href=
         *      "https://html.spec.whatwg.org/multipage/semantics.html#create-a-link-request">
         *      Relevant section in HTML specification</a>
         */
        public YWFetchRequest createLinkRequest() {
            // NOTE: All the step numbers(S#.) are based on spec from when this was
            // initially written(2026.03.07.)

            // S1.
            assert !href.isEmpty();

            YWURL url;

            try {
                // S2.
                url = YWURL.encodingParseURL(href, baseURL);
            } catch (YWSyntaxError e) {
                // S3.
                return null;
            }

            // S4.
            YWFetchRequest request = YWFetchRequest.createPotentialCORSRequest(url, destination, crossorigin);

            // S5.
            request.setPolicyContainer(policyContainer);

            // S6.
            request.setIntegrityMetadata(integrity);

            // S7.
            request.setCryptographicNonceMetadata(cryptographicNonceMetadata);

            // S8.
            request.setReferrerPolicy(referrerPolicy);

            // S9.
            request.setClient(environment);

            // S10.
            request.setPriority(fetchPriority);

            // S11.
            return request;
        }
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/semantics.html#create-link-options-from-element">
     *      Relevant section in HTML specification</a>
     */
    private LinkProcessingOptions createLinkOptions() {
        // NOTE: All the step numbers(S#.) are based on spec from when this was
        // initially written(2026.03.07.)

        // S1.
        YWDocument document = getNodeDocument();

        // S2.
        LinkProcessingOptions options = new LinkProcessingOptions(
                document.getDocumentBaseURL(),
                document.getOrigin(),
                document.getEnvironmentSettings(),
                document.getPolicyContainer());
        options.crossorigin = YWCORSSettings.fromAttribute(this, "crossorigin");
        options.referrerPolicy = getAttr("referrerpolicy"); // STUB
        options.sourceSet = sourceSet;
        options.document = document;
        options.cryptographicNonceMetadata = ""; // STUB
        options.fetchPriority = YWFetchRequest.Priority.fromAttribute(this, "fetchpriority");

        // S3.
        if (getAttr("href") != null) {
            options.href = getAttr("href");
        }

        // S4.
        if (getAttr("integrity") != null) {
            options.integrity = getAttr("integrity");
        }

        // S5.
        if (getAttr("type") != null) {
            options.tp = getAttr("type");
        }

        // S6.
        assert !options.href.isEmpty() || options.sourceSet != null;

        // S7.
        return options;
    }

    private void processLink() {
        String relAttr = getAttr("rel");
        if (relAttr == null) {
            return;
        }
        for (String rel : relAttr.split(" ")) {
            LinkType linkResource;
            switch (rel) {
                case "stylesheet":
                    linkResource = LINK_TYPE_STYLESHEET;
                    break;
                default:
                    continue;
            }
            linkResource.fetchAndProcessLinkedResource(this);
        }
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/links.html#the-link-is-an-alternative-stylesheet">
     *      Relevant section in HTML specification</a>
     */
    private boolean isAlternativeStyleSheet() {
        String relAttr = getAttr("rel");
        if (relAttr == null) {
            return false;
        }
        for (String rel : relAttr.split(" ")) {
            if (rel.equals("alternate")) {
                return true;
            }
        }
        return false;
    }
}
