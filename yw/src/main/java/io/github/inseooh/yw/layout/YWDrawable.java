package io.github.inseooh.yw.layout;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.Rectangle;

public sealed interface YWDrawable {
    void draw(Graphics2D dest);

    public record Text(
            int left, int top,
            String text,
            Font font,
            float size,
            Color color,
            YWLayoutText.DecorationOptions[] decorations) implements YWDrawable {

        @Override
        public void draw(Graphics2D dest) {
            // TODO Auto-generated method stub
            throw new UnsupportedOperationException("Unimplemented method 'draw'");
        }
    }

    public record Box(
            YWDrawable[] childItems,
            Rectangle rect,
            Color color) implements YWDrawable {

        @Override
        public void draw(Graphics2D dest) {
            dest.setColor(color);
            dest.drawRect(rect.x, rect.y, rect.width, rect.height);
            for (YWDrawable child : childItems) {
                child.draw(dest);
            }
        }

    }
}
