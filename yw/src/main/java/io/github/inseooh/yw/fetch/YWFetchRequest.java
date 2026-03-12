package io.github.inseooh.yw.fetch;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.dom.YWElement;
import io.github.inseooh.yw.html.YWEnumeratedAttributes;
import io.github.inseooh.yw.url.YWURL;

public final class YWFetchRequest {
    public static final record Header(String name, String value) {
    }

    public sealed interface TraversableForUserPrompts {
        public static final TraversableForUserPrompts NO_TRAVERSABLE = new TraversableForUserPrompts.NoTraversable();
        public static final TraversableForUserPrompts CLIENT = new TraversableForUserPrompts.Client();

        public static record NoTraversable() implements TraversableForUserPrompts {
        };

        public static record Client() implements TraversableForUserPrompts {
        };
    }

    public enum InitiatorType {
        AUDIO,
        BEACON,
        BODY,
        CSS,
        EARLY_HINTS,
        EMBED,
        FETCH,
        FONT,
        FRAME,
        IFRAME,
        IMAGE,
        IMG,
        INPUT,
        LINK,
        OBJECT,
        PING,
        SCRIPT,
        TRACK,
        VIDEO,
        XMLHTTPREQUEST,
        OTHER,
    };

    public enum ServiceWorkersMode {
        ALL, NONE
    }

    public enum Priority {
        HIGH, LOW, AUTO;

        public static Priority fromAttribute(YWElement element, String attrName) {
            return YWEnumeratedAttributes.fromAttribute(element, attrName, AUTO, null, AUTO, (attr) -> {
                switch (attr) {
                    case "high":
                        return HIGH;
                    case "low":
                        return LOW;
                    case "auto":
                        return AUTO;
                    default:
                        return null;
                }
            });
        }
    }

    public enum Mode {
        SAME_ORGIN, CORS, NO_CORS, NAVIGATE, WEBSOCKET, WEBTRANSPORT
    }

    public enum CredentialsMode {
        OMIT, SAME_ORGIN, INCLUDE
    }

    public enum CacheMode {
        DEFAULT, NO_STORE, RELOAD, NO_CACHE, FORCE_CACHE, ONLY_IF_CACHED
    }

    public enum RedirectMode {
        FOLLOW, ERROR, MANUAL
    }

    public enum ResponseTainting {
        BASIC, CORS, OPAQUE
    }

    private String method = "GET";
    private YWURL url;
    private boolean localURLOnly = false;
    private List<Header> headerList = new ArrayList<>();
    private boolean unsafeRequest = false;
    private byte[] body = null;
    private Object client; // STUB
    private Object reservedClient; // STUB
    private String replacesClientId = "";
    private TraversableForUserPrompts traversableForUserPrompts = TraversableForUserPrompts.CLIENT;
    private boolean keepalive = false;
    private InitiatorType initiatorType = null;
    private ServiceWorkersMode serviceWorkersMode = ServiceWorkersMode.ALL;
    private String initiator = "";
    private String destination = "";
    private Priority priority = Priority.AUTO;
    private Object internalPriority = null; // STUB
    private String origin = "client"; // STUB
    private Object topLevelNavigationInitiatorOrigin = null; // STUB
    private String policyContainer = "client"; // STUB
    private String referrer = "client"; // STUB
    private String referrerPolicy = "";
    private Mode mode = Mode.NO_CORS;
    private boolean useCORSPreflight = false;
    private CredentialsMode credentialsMode = CredentialsMode.SAME_ORGIN;
    private boolean useURLCredentials = false;
    private CacheMode cacheMode = CacheMode.DEFAULT;
    private RedirectMode redirectMode = RedirectMode.FOLLOW;
    private String integrityMetadata = "";
    private String cryptographicNonceMetadata = "";
    private String parserMetadata = "";
    private boolean reloadNavigation = false;
    private boolean historyNavigation = false;
    private boolean userActivation = false;
    private boolean renderBlocking = false;
    private int redirectCount = 0;
    private ResponseTainting responseTainting = ResponseTainting.BASIC;
    private boolean preventNoCacheCacheControlHeaderModification = false;
    private boolean done = false;
    private boolean timingAllowFailed = false;

    public YWFetchRequest(YWURL url, Object client, Object reservedClient) {
        this.url = url;
        this.client = client;
        this.reservedClient = reservedClient;
    }

    public YWURL[] getURLList() {
        return new YWURL[] { url };
    }

    public YWURL currentURL() {
        return getURLList()[getURLList().length - 1];
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public YWURL getUrl() {
        return url;
    }

    public void setUrl(YWURL url) {
        this.url = url;
    }

    public boolean isLocalURLOnly() {
        return localURLOnly;
    }

    public void setLocalURLOnly(boolean localURLOnly) {
        this.localURLOnly = localURLOnly;
    }

    public List<Header> getHeaderList() {
        return headerList;
    }

    public void setHeaderList(List<Header> headerList) {
        this.headerList = headerList;
    }

    public boolean isUnsafeRequest() {
        return unsafeRequest;
    }

    public void setUnsafeRequest(boolean unsafeRequest) {
        this.unsafeRequest = unsafeRequest;
    }

    public byte[] getBody() {
        return body;
    }

    public void setBody(byte[] body) {
        this.body = body;
    }

    public Object getClient() {
        return client;
    }

    public void setClient(Object client) {
        this.client = client;
    }

    public Object getReservedClient() {
        return reservedClient;
    }

    public void setReservedClient(Object reservedClient) {
        this.reservedClient = reservedClient;
    }

    public String getReplacesClientId() {
        return replacesClientId;
    }

    public void setReplacesClientId(String replacesClientId) {
        this.replacesClientId = replacesClientId;
    }

    public TraversableForUserPrompts getTraversableForUserPrompts() {
        return traversableForUserPrompts;
    }

    public void setTraversableForUserPrompts(TraversableForUserPrompts traversableForUserPrompts) {
        this.traversableForUserPrompts = traversableForUserPrompts;
    }

    public boolean isKeepalive() {
        return keepalive;
    }

    public void setKeepalive(boolean keepalive) {
        this.keepalive = keepalive;
    }

    public InitiatorType getInitiatorType() {
        return initiatorType;
    }

    public void setInitiatorType(InitiatorType initiatorType) {
        this.initiatorType = initiatorType;
    }

    public ServiceWorkersMode getServiceWorkersMode() {
        return serviceWorkersMode;
    }

    public void setServiceWorkersMode(ServiceWorkersMode serviceWorkersMode) {
        this.serviceWorkersMode = serviceWorkersMode;
    }

    public String getInitiator() {
        return initiator;
    }

    public void setInitiator(String initiator) {
        this.initiator = initiator;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public Object getInternalPriority() {
        return internalPriority;
    }

    public void setInternalPriority(Object internalPriority) {
        this.internalPriority = internalPriority;
    }

    public String getOrigin() {
        return origin;
    }

    public void setOrigin(String origin) {
        this.origin = origin;
    }

    public Object getTopLevelNavigationInitiatorOrigin() {
        return topLevelNavigationInitiatorOrigin;
    }

    public void setTopLevelNavigationInitiatorOrigin(Object topLevelNavigationInitiatorOrigin) {
        this.topLevelNavigationInitiatorOrigin = topLevelNavigationInitiatorOrigin;
    }

    public String getPolicyContainer() {
        return policyContainer;
    }

    public void setPolicyContainer(String policyContainer) {
        this.policyContainer = policyContainer;
    }

    public String getReferrer() {
        return referrer;
    }

    public void setReferrer(String referrer) {
        this.referrer = referrer;
    }

    public String getReferrerPolicy() {
        return referrerPolicy;
    }

    public void setReferrerPolicy(String referrerPolicy) {
        this.referrerPolicy = referrerPolicy;
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

    public boolean isUseCORSPreflight() {
        return useCORSPreflight;
    }

    public void setUseCORSPreflight(boolean useCORSPreflight) {
        this.useCORSPreflight = useCORSPreflight;
    }

    public CredentialsMode getCredentialsMode() {
        return credentialsMode;
    }

    public void setCredentialsMode(CredentialsMode credentialsMode) {
        this.credentialsMode = credentialsMode;
    }

    public boolean isUseURLCredentials() {
        return useURLCredentials;
    }

    public void setUseURLCredentials(boolean useURLCredentials) {
        this.useURLCredentials = useURLCredentials;
    }

    public CacheMode getCacheMode() {
        return cacheMode;
    }

    public void setCacheMode(CacheMode cacheMode) {
        this.cacheMode = cacheMode;
    }

    public RedirectMode getRedirectMode() {
        return redirectMode;
    }

    public void setRedirectMode(RedirectMode redirectMode) {
        this.redirectMode = redirectMode;
    }

    public String getIntegrityMetadata() {
        return integrityMetadata;
    }

    public void setIntegrityMetadata(String integrityMetadata) {
        this.integrityMetadata = integrityMetadata;
    }

    public String getCryptographicNonceMetadata() {
        return cryptographicNonceMetadata;
    }

    public void setCryptographicNonceMetadata(String cryptographicNonceMetadata) {
        this.cryptographicNonceMetadata = cryptographicNonceMetadata;
    }

    public String getParserMetadata() {
        return parserMetadata;
    }

    public void setParserMetadata(String parserMetadata) {
        this.parserMetadata = parserMetadata;
    }

    public boolean isReloadNavigation() {
        return reloadNavigation;
    }

    public void setReloadNavigation(boolean reloadNavigation) {
        this.reloadNavigation = reloadNavigation;
    }

    public boolean isHistoryNavigation() {
        return historyNavigation;
    }

    public void setHistoryNavigation(boolean historyNavigation) {
        this.historyNavigation = historyNavigation;
    }

    public boolean isUserActivation() {
        return userActivation;
    }

    public void setUserActivation(boolean userActivation) {
        this.userActivation = userActivation;
    }

    public boolean isRenderBlocking() {
        return renderBlocking;
    }

    public void setRenderBlocking(boolean renderBlocking) {
        this.renderBlocking = renderBlocking;
    }

    public int getRedirectCount() {
        return redirectCount;
    }

    public void setRedirectCount(int redirectCount) {
        this.redirectCount = redirectCount;
    }

    public ResponseTainting getResponseTainting() {
        return responseTainting;
    }

    public void setResponseTainting(ResponseTainting responseTainting) {
        this.responseTainting = responseTainting;
    }

    public boolean isPreventNoCacheCacheControlHeaderModification() {
        return preventNoCacheCacheControlHeaderModification;
    }

    public void setPreventNoCacheCacheControlHeaderModification(boolean preventNoCacheCacheControlHeaderModification) {
        this.preventNoCacheCacheControlHeaderModification = preventNoCacheCacheControlHeaderModification;
    }

    public boolean isDone() {
        return done;
    }

    public void setDone(boolean done) {
        this.done = done;
    }

    public boolean isTimingAllowFailed() {
        return timingAllowFailed;
    }

    public void setTimingAllowFailed(boolean timingAllowFailed) {
        this.timingAllowFailed = timingAllowFailed;
    }

    public interface FetchCallbacks {
        /**
         * @see <a href= "https://fetch.spec.whatwg.org/#process-request-body">
         *      Relevant section in Fetch specification</a>
         */
        default void processRequestBodyChunkLength(int transmittedBytesLength) {
        }

        /**
         * @see <a href= "https://fetch.spec.whatwg.org/#process-request-end-of-body">
         *      Relevant section in Fetch specification</a>
         */
        default void processRequestEndOfBody() {
        }

        /**
         * @see <a href=
         *      "https://fetch.spec.whatwg.org/#fetch-processearlyhintsresponse">
         *      Relevant section in Fetch specification</a>
         */
        default void processEarlyHintsResponse(YWFetchResponse response) {
        }

        /**
         * @see <a href=
         *      "https://fetch.spec.whatwg.org/#process-response">
         *      Relevant section in Fetch specification</a>
         */
        default void processResponse(YWFetchResponse response) {
        }

        /**
         * @see <a href=
         *      "https://fetch.spec.whatwg.org/#fetch-processresponseendofbody">
         *      Relevant section in Fetch specification</a>
         */
        default void processResponseEndOfBody(YWFetchResponse response) {
        }

        /**
         * @see <a href=
         *      "https://fetch.spec.whatwg.org/#process-response-end-of-body">
         *      Relevant section in Fetch specification</a>
         */
        default void processResponseConsumeBody(YWFetchResponse response, boolean isFailure, byte[] result) {
        }
    }

    /**
     * @see <a href= "https://fetch.spec.whatwg.org/#concept-fetch">
     *      Relevant section in Fetch specification</a>
     */
    public void fetch(boolean useParallelQueue, FetchCallbacks callbacks) {
        // STUB
        HttpClient client = HttpClient.newBuilder().build();
        HttpRequest request = HttpRequest.newBuilder().GET().uri(this.url.toURI()).build();
        try {
            HttpResponse<byte[]> httpResponse = client.send(request,
                    responseInfo -> HttpResponse.BodySubscribers.ofByteArray());
            callbacks.processResponseConsumeBody(new YWFetchResponse(), false, httpResponse.body());
        } catch (IOException e) {
            callbacks.processResponseConsumeBody(null, true, null);
        }  catch (InterruptedException e) {
            callbacks.processResponseConsumeBody(null, true, null);
        }
    }
}
