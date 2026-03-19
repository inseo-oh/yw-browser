package io.github.inseooh.yw.layout;

import java.awt.Color;
import java.awt.Font;

record YWLayoutText(String text, YWPhysicalRect rect, Color color, Font font, int fontSize,
        DecorationOptions[] decors) {
    public record DecorationOptions(DecorationType type, Color color, DecorationStyle style) {
    }

    public enum DecorationType {
        UNDERLINE, OVERLINE, THROUGH_TEXT
    }

    public enum DecorationStyle {
        SOLID, DOUBLE, DOTTED, DASHED, WAVY
    }
}
