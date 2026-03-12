package io.github.inseooh.yw.fetch;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.url.YWURL;

public class YWFetchResponse {
    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#concept-response-type">
     *      Relevant section in Fetch specification</a>
     */
    public enum Type {
        BASIC, CORS, DEFAULT, ERROR, OPAQUE, OPAQUEREDIRECT
    };

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#concept-response-type">
     *      Relevant section in Fetch specification</a>
     */
    private Type type = Type.DEFAULT;

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#concept-response-status">
     *      Relevant section in Fetch specification</a>
     */
    private int status = 200;

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#concept-response-url-list">
     *      Relevant section in Fetch specification</a>
     */
    private List<YWURL> urlList = new ArrayList<>();

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#null-body-status">
     *      Relevant section in Fetch specification</a>
     */
    public static boolean isNullBodyStatus(int status) {
        switch (status) {
            case 101:
            case 103:
            case 204:
            case 205:
            case 304:
                return true;
        }
        return false;
    }

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#ok-status">
     *      Relevant section in Fetch specification</a>
     */
    public static boolean isOKStatus(int status) {
        return 200 <= status && status <= 299;
    }

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#range-status">
     *      Relevant section in Fetch specification</a>
     */
    public static boolean isRangeStatus(int status) {
        switch (status) {
            case 206:
            case 416:
                return true;
        }
        return false;
    }

    /**
     * @see <a href=
     *      "https://fetch.spec.whatwg.org/#redirect-status">
     *      Relevant section in Fetch specification</a>
     */
    public static boolean isRedirectStatus(int status) {
        switch (status) {
            case 301:
            case 302:
            case 303:
            case 307:
            case 308:
                return true;
        }
        return false;
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-same-origin">
     *      Relevant section in Fetch specification</a>
     */
    public boolean isCORSSameOrigin() {
        switch (type) {
            case BASIC:
            case CORS:
            case DEFAULT:
                return true;
            default:
                return false;
        }
    }

    /**
     * @see <a href=
     *      "https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-cross-origin">
     *      Relevant section in Fetch specification</a>
     */
    public boolean isCORSCrossOrigin() {
        switch (type) {
            case OPAQUE:
            case OPAQUEREDIRECT:
                return true;
            default:
                return false;
        }
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public List<YWURL> getURLList() {
        return urlList;
    }

    public void setURLList(List<YWURL> urlList) {
        this.urlList = urlList;
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }
}