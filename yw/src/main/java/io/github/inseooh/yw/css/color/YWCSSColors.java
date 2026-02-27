package io.github.inseooh.yw.css.color;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import io.github.inseooh.yw.YWSyntaxError;
import io.github.inseooh.yw.YWUtility;
import io.github.inseooh.yw.css.syntax.YWCSSToken;
import io.github.inseooh.yw.css.syntax.YWCSSTokenStream;
import io.github.inseooh.yw.css.values.YWCSSLength;
import io.github.inseooh.yw.css.values.YWCSSNumber;

public class YWCSSColors {
	public static final YWCSSColor CURRENT_COLOR = new YWCSSRGBColor(0, 0, 0, 0);
	public static final YWCSSColor TRANSPARENT = new YWCSSRGBColor(0, 0, 0, 0);
	public static final Map<String, YWCSSColor> NAMED_COLORS = new HashMap<>();

	static {
		NAMED_COLORS.put("aliceblue", new YWCSSRGBColor(240, 248, 255));
		NAMED_COLORS.put("antiquewhite", new YWCSSRGBColor(250, 235, 215));
		NAMED_COLORS.put("aqua", new YWCSSRGBColor(0, 255, 255));
		NAMED_COLORS.put("aquamarine", new YWCSSRGBColor(127, 255, 212));
		NAMED_COLORS.put("azure", new YWCSSRGBColor(240, 255, 255));
		NAMED_COLORS.put("beige", new YWCSSRGBColor(245, 245, 220));
		NAMED_COLORS.put("bisque", new YWCSSRGBColor(255, 228, 196));
		NAMED_COLORS.put("black", new YWCSSRGBColor(0, 0, 0));
		NAMED_COLORS.put("blanchedalmond", new YWCSSRGBColor(255, 235, 205));
		NAMED_COLORS.put("blue", new YWCSSRGBColor(0, 0, 255));
		NAMED_COLORS.put("blueviolet", new YWCSSRGBColor(138, 43, 226));
		NAMED_COLORS.put("brown", new YWCSSRGBColor(165, 42, 42));
		NAMED_COLORS.put("burlywood", new YWCSSRGBColor(222, 184, 135));
		NAMED_COLORS.put("cadetblue", new YWCSSRGBColor(95, 158, 160));
		NAMED_COLORS.put("chartreuse", new YWCSSRGBColor(127, 255, 0));
		NAMED_COLORS.put("chocolate", new YWCSSRGBColor(210, 105, 30));
		NAMED_COLORS.put("coral", new YWCSSRGBColor(255, 127, 80));
		NAMED_COLORS.put("cornflowerblue", new YWCSSRGBColor(100, 149, 237));
		NAMED_COLORS.put("cornsilk", new YWCSSRGBColor(255, 248, 220));
		NAMED_COLORS.put("crimson", new YWCSSRGBColor(220, 20, 60));
		NAMED_COLORS.put("cyan", new YWCSSRGBColor(0, 255, 255));
		NAMED_COLORS.put("darkblue", new YWCSSRGBColor(0, 0, 139));
		NAMED_COLORS.put("darkcyan", new YWCSSRGBColor(0, 139, 139));
		NAMED_COLORS.put("darkgoldenrod", new YWCSSRGBColor(184, 134, 11));
		NAMED_COLORS.put("darkgray", new YWCSSRGBColor(169, 169, 169));
		NAMED_COLORS.put("darkgreen", new YWCSSRGBColor(0, 100, 0));
		NAMED_COLORS.put("darkgrey", new YWCSSRGBColor(169, 169, 169));
		NAMED_COLORS.put("darkkhaki", new YWCSSRGBColor(189, 183, 107));
		NAMED_COLORS.put("darkmagenta", new YWCSSRGBColor(139, 0, 139));
		NAMED_COLORS.put("darkolivegreen", new YWCSSRGBColor(85, 107, 47));
		NAMED_COLORS.put("darkorange", new YWCSSRGBColor(255, 140, 0));
		NAMED_COLORS.put("darkorchid", new YWCSSRGBColor(153, 50, 204));
		NAMED_COLORS.put("darkred", new YWCSSRGBColor(139, 0, 0));
		NAMED_COLORS.put("darksalmon", new YWCSSRGBColor(233, 150, 122));
		NAMED_COLORS.put("darkseagreen", new YWCSSRGBColor(143, 188, 143));
		NAMED_COLORS.put("darkslateblue", new YWCSSRGBColor(72, 61, 139));
		NAMED_COLORS.put("darkslategray", new YWCSSRGBColor(47, 79, 79));
		NAMED_COLORS.put("darkslategrey", new YWCSSRGBColor(47, 79, 79));
		NAMED_COLORS.put("darkturquoise", new YWCSSRGBColor(0, 206, 209));
		NAMED_COLORS.put("darkviolet", new YWCSSRGBColor(148, 0, 211));
		NAMED_COLORS.put("deeppink", new YWCSSRGBColor(255, 20, 147));
		NAMED_COLORS.put("deepskyblue", new YWCSSRGBColor(0, 191, 255));
		NAMED_COLORS.put("dimgray", new YWCSSRGBColor(105, 105, 105));
		NAMED_COLORS.put("dimgrey", new YWCSSRGBColor(105, 105, 105));
		NAMED_COLORS.put("dodgerblue", new YWCSSRGBColor(30, 144, 255));
		NAMED_COLORS.put("firebrick", new YWCSSRGBColor(178, 34, 34));
		NAMED_COLORS.put("floralwhite", new YWCSSRGBColor(255, 250, 240));
		NAMED_COLORS.put("forestgreen", new YWCSSRGBColor(34, 139, 34));
		NAMED_COLORS.put("fuchsia", new YWCSSRGBColor(255, 0, 255));
		NAMED_COLORS.put("gainsboro", new YWCSSRGBColor(220, 220, 220));
		NAMED_COLORS.put("ghostwhite", new YWCSSRGBColor(248, 248, 255));
		NAMED_COLORS.put("gold", new YWCSSRGBColor(255, 215, 0));
		NAMED_COLORS.put("goldenrod", new YWCSSRGBColor(218, 165, 32));
		NAMED_COLORS.put("gray", new YWCSSRGBColor(128, 128, 128));
		NAMED_COLORS.put("green", new YWCSSRGBColor(0, 128, 0));
		NAMED_COLORS.put("greenyellow", new YWCSSRGBColor(173, 255, 47));
		NAMED_COLORS.put("grey", new YWCSSRGBColor(128, 128, 128));
		NAMED_COLORS.put("honeydew", new YWCSSRGBColor(240, 255, 240));
		NAMED_COLORS.put("hotpink", new YWCSSRGBColor(255, 105, 180));
		NAMED_COLORS.put("indianred", new YWCSSRGBColor(205, 92, 92));
		NAMED_COLORS.put("indigo", new YWCSSRGBColor(75, 0, 130));
		NAMED_COLORS.put("ivory", new YWCSSRGBColor(255, 255, 240));
		NAMED_COLORS.put("khaki", new YWCSSRGBColor(240, 230, 140));
		NAMED_COLORS.put("lavender", new YWCSSRGBColor(230, 230, 250));
		NAMED_COLORS.put("lavenderblush", new YWCSSRGBColor(255, 240, 245));
		NAMED_COLORS.put("lawngreen", new YWCSSRGBColor(124, 252, 0));
		NAMED_COLORS.put("lemonchiffon", new YWCSSRGBColor(255, 250, 205));
		NAMED_COLORS.put("lightblue", new YWCSSRGBColor(173, 216, 230));
		NAMED_COLORS.put("lightcoral", new YWCSSRGBColor(240, 128, 128));
		NAMED_COLORS.put("lightcyan", new YWCSSRGBColor(224, 255, 255));
		NAMED_COLORS.put("lightgoldenrodyellow", new YWCSSRGBColor(250, 250, 210));
		NAMED_COLORS.put("lightgray", new YWCSSRGBColor(211, 211, 211));
		NAMED_COLORS.put("lightgreen", new YWCSSRGBColor(144, 238, 144));
		NAMED_COLORS.put("lightgrey", new YWCSSRGBColor(211, 211, 211));
		NAMED_COLORS.put("lightpink", new YWCSSRGBColor(255, 182, 193));
		NAMED_COLORS.put("lightsalmon", new YWCSSRGBColor(255, 160, 122));
		NAMED_COLORS.put("lightseagreen", new YWCSSRGBColor(32, 178, 170));
		NAMED_COLORS.put("lightskyblue", new YWCSSRGBColor(135, 206, 250));
		NAMED_COLORS.put("lightslategray", new YWCSSRGBColor(119, 136, 153));
		NAMED_COLORS.put("lightslategrey", new YWCSSRGBColor(119, 136, 153));
		NAMED_COLORS.put("lightsteelblue", new YWCSSRGBColor(176, 196, 222));
		NAMED_COLORS.put("lightyellow", new YWCSSRGBColor(255, 255, 224));
		NAMED_COLORS.put("lime", new YWCSSRGBColor(0, 255, 0));
		NAMED_COLORS.put("limegreen", new YWCSSRGBColor(50, 205, 50));
		NAMED_COLORS.put("linen", new YWCSSRGBColor(250, 240, 230));
		NAMED_COLORS.put("magenta", new YWCSSRGBColor(255, 0, 255));
		NAMED_COLORS.put("maroon", new YWCSSRGBColor(128, 0, 0));
		NAMED_COLORS.put("mediumaquamarine", new YWCSSRGBColor(102, 205, 170));
		NAMED_COLORS.put("mediumblue", new YWCSSRGBColor(0, 0, 205));
		NAMED_COLORS.put("mediumorchid", new YWCSSRGBColor(186, 85, 211));
		NAMED_COLORS.put("mediumpurple", new YWCSSRGBColor(147, 112, 219));
		NAMED_COLORS.put("mediumseagreen", new YWCSSRGBColor(60, 179, 113));
		NAMED_COLORS.put("mediumslateblue", new YWCSSRGBColor(123, 104, 238));
		NAMED_COLORS.put("mediumspringgreen", new YWCSSRGBColor(0, 250, 154));
		NAMED_COLORS.put("mediumturquoise", new YWCSSRGBColor(72, 209, 204));
		NAMED_COLORS.put("mediumvioletred", new YWCSSRGBColor(199, 21, 133));
		NAMED_COLORS.put("midnightblue", new YWCSSRGBColor(25, 25, 112));
		NAMED_COLORS.put("mintcream", new YWCSSRGBColor(245, 255, 250));
		NAMED_COLORS.put("mistyrose", new YWCSSRGBColor(255, 228, 225));
		NAMED_COLORS.put("moccasin", new YWCSSRGBColor(255, 228, 181));
		NAMED_COLORS.put("navajowhite", new YWCSSRGBColor(255, 222, 173));
		NAMED_COLORS.put("navy", new YWCSSRGBColor(0, 0, 128));
		NAMED_COLORS.put("oldlace", new YWCSSRGBColor(253, 245, 230));
		NAMED_COLORS.put("olive", new YWCSSRGBColor(128, 128, 0));
		NAMED_COLORS.put("olivedrab", new YWCSSRGBColor(107, 142, 35));
		NAMED_COLORS.put("orange", new YWCSSRGBColor(255, 165, 0));
		NAMED_COLORS.put("orangered", new YWCSSRGBColor(255, 69, 0));
		NAMED_COLORS.put("orchid", new YWCSSRGBColor(218, 112, 214));
		NAMED_COLORS.put("palegoldenrod", new YWCSSRGBColor(238, 232, 170));
		NAMED_COLORS.put("palegreen", new YWCSSRGBColor(152, 251, 152));
		NAMED_COLORS.put("paleturquoise", new YWCSSRGBColor(175, 238, 238));
		NAMED_COLORS.put("palevioletred", new YWCSSRGBColor(219, 112, 147));
		NAMED_COLORS.put("papayawhip", new YWCSSRGBColor(255, 239, 213));
		NAMED_COLORS.put("peachpuff", new YWCSSRGBColor(255, 218, 185));
		NAMED_COLORS.put("peru", new YWCSSRGBColor(205, 133, 63));
		NAMED_COLORS.put("pink", new YWCSSRGBColor(255, 192, 203));
		NAMED_COLORS.put("plum", new YWCSSRGBColor(221, 160, 221));
		NAMED_COLORS.put("powderblue", new YWCSSRGBColor(176, 224, 230));
		NAMED_COLORS.put("purple", new YWCSSRGBColor(128, 0, 128));
		NAMED_COLORS.put("rebeccapurple", new YWCSSRGBColor(102, 51, 153));
		NAMED_COLORS.put("red", new YWCSSRGBColor(255, 0, 0));
		NAMED_COLORS.put("rosybrown", new YWCSSRGBColor(188, 143, 143));
		NAMED_COLORS.put("royalblue", new YWCSSRGBColor(65, 105, 225));
		NAMED_COLORS.put("saddlebrown", new YWCSSRGBColor(139, 69, 19));
		NAMED_COLORS.put("salmon", new YWCSSRGBColor(250, 128, 114));
		NAMED_COLORS.put("sandybrown", new YWCSSRGBColor(244, 164, 96));
		NAMED_COLORS.put("seagreen", new YWCSSRGBColor(46, 139, 87));
		NAMED_COLORS.put("seashell", new YWCSSRGBColor(255, 245, 238));
		NAMED_COLORS.put("sienna", new YWCSSRGBColor(160, 82, 45));
		NAMED_COLORS.put("silver", new YWCSSRGBColor(192, 192, 192));
		NAMED_COLORS.put("skyblue", new YWCSSRGBColor(135, 206, 235));
		NAMED_COLORS.put("slateblue", new YWCSSRGBColor(106, 90, 205));
		NAMED_COLORS.put("slategray", new YWCSSRGBColor(112, 128, 144));
		NAMED_COLORS.put("slategrey", new YWCSSRGBColor(112, 128, 144));
		NAMED_COLORS.put("snow", new YWCSSRGBColor(255, 250, 250));
		NAMED_COLORS.put("springgreen", new YWCSSRGBColor(0, 255, 127));
		NAMED_COLORS.put("steelblue", new YWCSSRGBColor(70, 130, 180));
		NAMED_COLORS.put("tan", new YWCSSRGBColor(210, 180, 140));
		NAMED_COLORS.put("teal", new YWCSSRGBColor(0, 128, 128));
		NAMED_COLORS.put("thistle", new YWCSSRGBColor(216, 191, 216));
		NAMED_COLORS.put("tomato", new YWCSSRGBColor(255, 99, 71));
		NAMED_COLORS.put("turquoise", new YWCSSRGBColor(64, 224, 208));
		NAMED_COLORS.put("violet", new YWCSSRGBColor(238, 130, 238));
		NAMED_COLORS.put("wheat", new YWCSSRGBColor(245, 222, 179));
		NAMED_COLORS.put("white", new YWCSSRGBColor(255, 255, 255));
		NAMED_COLORS.put("whitesmoke", new YWCSSRGBColor(245, 245, 245));
		NAMED_COLORS.put("yellow", new YWCSSRGBColor(255, 255, 0));
		NAMED_COLORS.put("yellowgreen", new YWCSSRGBColor(154, 205, 50));
	}

	/**
	 * @see <a href="https://www.w3.org/TR/css-color-4/#hex-notation"> Relevant
	 *      section in CSS specification</a>
	 */
	private static YWCSSColor parseHexNotation(YWCSSToken.Hash hashToken) throws YWSyntaxError {
		String hashValue = hashToken.getValue();
		String rStr, gStr, bStr, aStr = "ff";
		switch (hashValue.length()) {
		case 3:
			// #rgb
			rStr = Character.toString(hashValue.charAt(0));
			rStr += rStr;
			gStr = Character.toString(hashValue.charAt(1));
			gStr += gStr;
			bStr = Character.toString(hashValue.charAt(2));
			bStr += bStr;
			break;
		case 4:
			// #rgba
			rStr = Character.toString(hashValue.charAt(0));
			rStr += rStr;
			gStr = Character.toString(hashValue.charAt(1));
			gStr += gStr;
			bStr = Character.toString(hashValue.charAt(2));
			bStr += bStr;
			aStr = Character.toString(hashValue.charAt(3));
			aStr += aStr;
			break;
		case 6:
			// #rrggbb
			rStr = hashValue.substring(0, 2);
			gStr = hashValue.substring(2, 4);
			bStr = hashValue.substring(4, 6);
			break;
		case 8:
			// #rrggbb
			rStr = hashValue.substring(0, 2);
			gStr = hashValue.substring(2, 4);
			bStr = hashValue.substring(4, 6);
			aStr = hashValue.substring(6, 8);
			break;
		default:
			throw new YWSyntaxError();
		}
		int r = Integer.parseInt(rStr);
		int g = Integer.parseInt(gStr);
		int b = Integer.parseInt(bStr);
		int a = Integer.parseInt(aStr);
		return new YWCSSRGBColor(r, g, b, a);
	}

	private static int parseNumberOrPercentageComponent(YWCSSTokenStream ts) throws YWSyntaxError {
		try {
			float v = YWCSSNumber.parseNumber(ts);
			return (int) (YWUtility.clamp(v, 0, 1) * 255);
		} catch (YWSyntaxError e) {
		}
		try {
			YWCSSLength v = YWCSSLength.parsePercentage(ts);
			return (int) (v.getValue() * 255);
		} catch (YWSyntaxError e) {
		}
		throw new YWSyntaxError();
	}

	/**
	 * @see <a href="https://www.w3.org/TR/css-color-4/#typedef-legacy-rgb-syntax">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWCSSColor parseLegacyRGBSyntax(YWCSSToken.ASTFunction func) throws YWSyntaxError {
		int r, g, b, a = 255;

		YWCSSTokenStream ts = new YWCSSTokenStream(func.getTokens());
		// rgb(< >r , g , b ) --------------------------------------------
		// rgb(< >r , g , b , a ) --------------------------------------
		ts.skipWhitespaces();
		// rgb( <r , g , b> ) --------------------------------------------
		// rgb( <r , g , b> , a ) --------------------------------------
		YWCSSLength[] per = ts.parseCommaSeparatedRepeation(new YWCSSLength[0], () -> {
			return YWCSSLength.parsePercentage(ts);
		});
		if (per.length == 3) {
			// Percentage value
			float rPer = YWUtility.clamp(per[0].getValue(), 0, 100);
			float gPer = YWUtility.clamp(per[1].getValue(), 0, 100);
			float bBer = YWUtility.clamp(per[2].getValue(), 0, 100);
			r = (int) ((rPer / 100) * 255);
			g = (int) ((gPer / 100) * 255);
			b = (int) ((bBer / 100) * 255);
		} else if (per.length == 0) {
			Float[] num = ts.parseCommaSeparatedRepeation(new Float[0], () -> {
				return YWCSSNumber.parseNumber(ts);
			});
			r = (int) YWUtility.clamp(num[0], 0, 255);
			g = (int) YWUtility.clamp(num[1], 0, 255);
			b = (int) YWUtility.clamp(num[2], 0, 255);
		} else {
			throw new YWSyntaxError();
		}
		// rgb( r , g , b< >) --------------------------------------------
		// rgb( r , g , b< >, a ) --------------------------------------
		ts.skipWhitespaces();
		// rgb( r , g , b <,> a ) --------------------------------------
		if (ts.expectToken(YWCSSToken.Type.COMMA) != null) {
			// rgb( r , g , b ,< >a ) ----------------------------------
			ts.skipWhitespaces();
			// rgb( r , g , b , <a> ) ----------------------------------
			a = parseNumberOrPercentageComponent(ts);
			// rgb( r , g , b , a< >) ----------------------------------
			ts.skipWhitespaces();
		}
		if (!ts.isEndOfTokens()) {
			throw new YWSyntaxError();
		}
		return new YWCSSRGBColor(r, g, b, a);
	}
	/**
	 * @see <a href="https://www.w3.org/TR/css-color-4/#typedef-modern-rgb-syntax">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWCSSColor parseModernRGBSyntax(YWCSSToken.ASTFunction func) throws YWSyntaxError {
		int r, g, b, a = 255;

		YWCSSTokenStream ts = new YWCSSTokenStream(func.getTokens());
		// rgb(<  >r  g  b  ) --------------------------------------------------
		// rgb(<  >r  g  b  /  a  ) --------------------------------------------
		ts.skipWhitespaces();
		// rgb(  <r  g  b  >) --------------------------------------------------
		// rgb(  <r  g  b  >/  a  ) --------------------------------------------
		int[] components = new int[3];
		for (int i = 0; i < 3; i++) {
			// rgb(  <r>  <g>  <b>  ) ------------------------------------------
			// rgb(  <r>  <g>  <b>  /  a  ) ------------------------------------
			int v;
			if (ts.expectIdent("none")) {
				// TODO
				throw new YWSyntaxError();
			} else {
				v = parseNumberOrPercentageComponent(ts);
			}
			components[i] = v;
			// rgb(  r<  >g<  >b<  >) ------------------------------------------
			// rgb(  r<  >g<  >b<  >/  a  ) ------------------------------------
			ts.skipWhitespaces();
		}
		r = components[0];
		g = components[1];
		b = components[2];
		// rgb(  r  g  b  </>  a  ) --------------------------------------------
		if (ts.expectDelim('/')) {
			// rgb(  r  g  b  /<  >a  ) --------------------------------------------
			ts.skipWhitespaces();
			// rgb(  r  g  b  /  <a>  ) --------------------------------------------
			a = parseNumberOrPercentageComponent(ts);
			// rgb(  r  g  b  /  a<  >) --------------------------------------------
			ts.skipWhitespaces();
		}
		if (!ts.isEndOfTokens()) {
			throw new YWSyntaxError();
		}
		return new YWCSSRGBColor(r, g, b, a);
	}
	/**
	 * @throws YWSyntaxError 
	 * @see <a href="https://www.w3.org/TR/css-color-4/#funcdef-rgb">
	 *      Relevant section in CSS specification</a>
	 */
	private static YWCSSColor parseRGBFunction(YWCSSToken.ASTFunction func) throws YWSyntaxError {
		try {
			return parseLegacyRGBSyntax(func);
		} catch (YWSyntaxError e) {
		}
		try {
			return parseModernRGBSyntax(func);
		} catch (YWSyntaxError e) {
		}
		throw new YWSyntaxError();
	}
	

	public static YWCSSColor parseColor(YWCSSTokenStream ts) throws YWSyntaxError {
		int oldCursor = ts.getCursor();
		YWCSSToken.Hash hashToken = (YWCSSToken.Hash) ts.expectToken(YWCSSToken.Type.HASH);
		if (hashToken != null) {
			return parseHexNotation(hashToken);
		}
		YWCSSToken.ASTFunction func = ts.expectAstFunc("rgb");
		if (func == null) {
			func = ts.expectAstFunc("rgba");
		}
		if (func != null) {
			return parseRGBFunction(func);
		}
		// TODO: hsl(), hsla()
		// TODO: hwb()
		// TODO: lab()
		// TODO: lch()
		// TODO: oklab()
		// TODO: oklch()
		// TODO: color()

		YWCSSToken.Ident ident = (YWCSSToken.Ident)ts.expectToken(YWCSSToken.Type.IDENT);
		if (ident != null) {
			if (NAMED_COLORS.containsKey(ident.getValue())) {
			return	NAMED_COLORS.get(ident.getValue());
			}
			if (ident.getValue().toLowerCase(Locale.ROOT) == "transparent") {
				return TRANSPARENT;
			}
			if (ident.getValue().toLowerCase(Locale.ROOT) == "currentcolor") {
				return CURRENT_COLOR;
			}
			
		}
		

		throw new YWSyntaxError();
	}
}
