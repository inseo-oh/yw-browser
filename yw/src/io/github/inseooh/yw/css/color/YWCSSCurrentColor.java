package io.github.inseooh.yw.css.color;

import java.awt.Color;

public class YWCSSCurrentColor implements YWCSSColor {
	@Override
	public Color toAWTColor() {
		// currentColor values must be replaced with a real color.
		throw new RuntimeException("currentColor cannot be converted to AWT color");
	}

}
