package io.github.inseooh.yw.html.parsing;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.dom.YWAttr;

public sealed interface YWHTMLToken {
    public record EOF() implements YWHTMLToken {
    };

    public final class Character implements YWHTMLToken {
        private int codePoint;

        public Character(int codePoint) {
            this.codePoint = codePoint;
        }

        public int getCodePoint() {
            return codePoint;
        }

        public void setCodePoint(int codePoint) {
            this.codePoint = codePoint;
        }
    }

    public final class Comment implements YWHTMLToken {
        private final StringBuilder data = new StringBuilder();

        public StringBuilder getData() {
            return data;
        }
    }

    /**
     * NOTE: All three fields may be NULL.
     */
    public final class Doctype implements YWHTMLToken {
        private StringBuilder name = null;
        private StringBuilder publicId = null;
        private StringBuilder systemId = null;
        private boolean forceQuirks = false;

        public StringBuilder getName() {
            return name;
        }

        public void setName(StringBuilder name) {
            this.name = name;
        }

        public StringBuilder getPublicId() {
            return publicId;
        }

        public void setPublicId(StringBuilder publicId) {
            this.publicId = publicId;
        }

        public StringBuilder getSystemId() {
            return systemId;
        }

        public void setSystemId(StringBuilder systemId) {
            this.systemId = systemId;
        }

        public boolean isForceQuirks() {
            return forceQuirks;
        }

        public void setForceQuirks(boolean forceQuirks) {
            this.forceQuirks = forceQuirks;
        }

    }

    public final class Tag implements YWHTMLToken {
        private final StringBuilder name = new StringBuilder();
        private final List<YWAttr.Data> attrs = new ArrayList<>();
        private final List<Integer> attrIndicesToRemove = new ArrayList<>();
        private final boolean isEnd;
        private boolean isSelfClosing = false;

        public Tag(boolean isEnd) {
            this.isEnd = isEnd;
        }

        public StringBuilder getName() {
            return name;
        }

        public List<YWAttr.Data> getAttrs() {
            return attrs;
        }

        public List<Integer> getAttrIndicesToRemove() {
            return attrIndicesToRemove;
        }

        public boolean isEnd() {
            return isEnd;
        }

        public boolean isStart() {
            return !isEnd;
        }

        public boolean isSelfClosing() {
            return isSelfClosing;
        }

        public void setSelfClosing(boolean isSelfClosing) {
            this.isSelfClosing = isSelfClosing;
        }

    }

}
