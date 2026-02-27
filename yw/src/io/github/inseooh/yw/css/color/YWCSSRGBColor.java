package io.github.inseooh.yw.css.color;

import java.awt.Color;

public class YWCSSRGBColor implements YWCSSColor {
	private Color color;

	public YWCSSRGBColor(Color color) {
		this.color = color;
	}
	
	public YWCSSRGBColor(int red, int green, int blue) {
		this(new Color(red, green, blue));
	}
	public YWCSSRGBColor(int red, int green, int blue, int alpha) {
		this(new Color(red, green, blue, alpha));
	}

	@Override
	public Color toAWTColor() {
		return color;
	}

}
