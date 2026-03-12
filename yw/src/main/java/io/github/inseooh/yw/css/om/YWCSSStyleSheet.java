package io.github.inseooh.yw.css.om;

import java.util.ArrayList;
import java.util.List;

import io.github.inseooh.yw.dom.YWDocument;
import io.github.inseooh.yw.dom.YWNode;

public class YWCSSStyleSheet {
    private String type = "text/css";
    private String location = null;
    private YWCSSStyleSheet parentStyleSheet = null;
    private YWNode ownerNode = null;
    private YWCSSRule ownerCSSRule = null;
    private YWCSSMediaList media = new YWCSSMediaList();
    private String title = "";
    private boolean alternateFlag = false;
    private boolean disabledFlag = false;
    private final List<YWCSSRule> styleRules = new ArrayList<>();
    private boolean originCleanFlag; /*  */
    private boolean constructedFlag = false;
    private boolean disallowModificationFlag = false;
    private YWDocument constructorDocument = null;
    private String stylesheetBaseURL = null;

    public YWCSSStyleSheet() {
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public YWCSSStyleSheet getParentStyleSheet() {
        return parentStyleSheet;
    }

    public void setParentStyleSheet(YWCSSStyleSheet parentStyleSheet) {
        this.parentStyleSheet = parentStyleSheet;
    }

    public YWNode getOwnerNode() {
        return ownerNode;
    }

    public void setOwnerNode(YWNode ownerNode) {
        this.ownerNode = ownerNode;
    }

    public YWCSSRule getOwnerCSSRule() {
        return ownerCSSRule;
    }

    public void setOwnerCSSRule(YWCSSRule ownerCSSRule) {
        this.ownerCSSRule = ownerCSSRule;
    }

    public YWCSSMediaList getMedia() {
        return media;
    }

    public void setMedia(YWCSSMediaList media) {
        this.media = media;
    }

    public void setMedia(String media) {
        // TODO
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public boolean isAlternateFlag() {
        return alternateFlag;
    }

    public void setAlternateFlag(boolean alternateFlag) {
        this.alternateFlag = alternateFlag;
    }

    public boolean isDisabledFlag() {
        return disabledFlag;
    }

    public void setDisabledFlag(boolean disabledFlag) {
        this.disabledFlag = disabledFlag;
    }

    public List<YWCSSRule> getStyleRules() {
        return styleRules;
    }

    public boolean isOriginCleanFlag() {
        return originCleanFlag;
    }

    public void setOriginCleanFlag(boolean originCleanFlag) {
        this.originCleanFlag = originCleanFlag;
    }

    public boolean isConstructedFlag() {
        return constructedFlag;
    }

    public void setConstructedFlag(boolean constructedFlag) {
        this.constructedFlag = constructedFlag;
    }

    public boolean isDisallowModificationFlag() {
        return disallowModificationFlag;
    }

    public void setDisallowModificationFlag(boolean disallowModificationFlag) {
        this.disallowModificationFlag = disallowModificationFlag;
    }

    public YWDocument getConstructorDocument() {
        return constructorDocument;
    }

    public void setConstructorDocument(YWDocument constructorDocument) {
        this.constructorDocument = constructorDocument;
    }

    public String getStylesheetBaseURL() {
        return stylesheetBaseURL;
    }

    public void setStylesheetBaseURL(String stylesheetBaseURL) {
        this.stylesheetBaseURL = stylesheetBaseURL;
    }

}
