package io.github.inseooh.yw.encoding;

import java.util.HashMap;

import io.github.inseooh.yw.YWUtility;

public enum YWEncoding {
	/* 8. The encoding */
	UTF8,
	/* 9. Legacy single-byte encodings */
	IBM866, ISO8859_2, ISO8859_3, ISO8859_4, ISO8859_5, ISO8859_6, ISO8859_7, ISO8859_8, ISO8859_8I, ISO8859_10,
	ISO8859_13, ISO8859_14, ISO8859_15, ISO8859_16, KOI8R, KOI8U, MACINTOSH, WINDOWS874, WINDOWS1250, WINDOWS1251,
	WINDOWS1252, WINDOWS1253, WINDOWS1254, WINDOWS1255, WINDOWS1256, WINDOWS1257, WINDOWS1258, X_MAC_CYRILLIC,
	/* 10. Legacy multi-byte Chinese (simplified) encodings */
	GBK, GB18030,
	/* 11. Legacy multi-byte Chinese (traditional) encodings */
	BIG5,
	/* 12. Legacy multi-byte Japanese encodings */
	EUC_JP, ISO2022_JP, SHIFT_JIS,
	/* 13. Legacy multi-byte Korean encodings */
	EUC_KR,
	/* 14. Legacy miscellaneous encodings */
	REPLACEMENT, UTF16_BE, UTF16_LE, X_USER_DEFINED;

	private static final HashMap<String, YWEncoding> LABELS = new HashMap<>();
	static {
		LABELS.put("unicode-1-1-utf-8", UTF8);
		LABELS.put("unicode11utf8", UTF8);
		LABELS.put("unicode20utf8", UTF8);
		LABELS.put("utf-8", UTF8);
		LABELS.put("utf8", UTF8);
		LABELS.put("x-unicode20utf8", UTF8);

		LABELS.put("866", IBM866);
		LABELS.put("cp866", IBM866);
		LABELS.put("csibm866", IBM866);
		LABELS.put("ibm866", IBM866);

		LABELS.put("csisolatin2", ISO8859_2);
		LABELS.put("iso-8859-2", ISO8859_2);
		LABELS.put("iso-ir-101", ISO8859_2);
		LABELS.put("iso8859-2", ISO8859_2);
		LABELS.put("iso88592", ISO8859_2);
		LABELS.put("iso_8859-2", ISO8859_2);
		LABELS.put("iso_8859-2:1987", ISO8859_2);
		LABELS.put("l2", ISO8859_2);
		LABELS.put("latin2", ISO8859_2);

		LABELS.put("csisolatin3", ISO8859_3);
		LABELS.put("iso-8859-3", ISO8859_3);
		LABELS.put("iso-ir-109", ISO8859_3);
		LABELS.put("iso8859-3", ISO8859_3);
		LABELS.put("iso88593", ISO8859_3);
		LABELS.put("iso_8859-3", ISO8859_3);
		LABELS.put("iso_8859-3:1988", ISO8859_3);
		LABELS.put("l3", ISO8859_3);
		LABELS.put("latin3", ISO8859_3);

		LABELS.put("csisolatin4", ISO8859_4);
		LABELS.put("iso-8859-4", ISO8859_4);
		LABELS.put("iso-ir-110", ISO8859_4);
		LABELS.put("iso8859-4", ISO8859_4);
		LABELS.put("iso88594", ISO8859_4);
		LABELS.put("iso_8859-4", ISO8859_4);
		LABELS.put("iso_8859-4:1988", ISO8859_4);
		LABELS.put("l4", ISO8859_4);
		LABELS.put("latin4", ISO8859_4);

		LABELS.put("csisolatincyrillic", ISO8859_5);
		LABELS.put("cyrillic", ISO8859_5);
		LABELS.put("iso-8859-5", ISO8859_5);
		LABELS.put("iso-ir-144", ISO8859_5);
		LABELS.put("iso8859-5", ISO8859_5);
		LABELS.put("iso88595", ISO8859_5);
		LABELS.put("iso_8859-5", ISO8859_5);
		LABELS.put("iso_8859-5:1988", ISO8859_5);

		LABELS.put("arabic", ISO8859_6);
		LABELS.put("asmo-708", ISO8859_6);
		LABELS.put("csiso88596e", ISO8859_6);
		LABELS.put("csiso88596i", ISO8859_6);
		LABELS.put("csisolatinarabic", ISO8859_6);
		LABELS.put("ecma-114", ISO8859_6);
		LABELS.put("iso-8859-6", ISO8859_6);
		LABELS.put("iso-8859-6-e", ISO8859_6);
		LABELS.put("iso-8859-6-i", ISO8859_6);
		LABELS.put("iso-ir-127", ISO8859_6);
		LABELS.put("iso8859-6", ISO8859_6);
		LABELS.put("iso88596", ISO8859_6);
		LABELS.put("iso_8859-6", ISO8859_6);
		LABELS.put("iso_8859-6:1987", ISO8859_6);

		LABELS.put("csisolatingreek", ISO8859_7);
		LABELS.put("ecma-118", ISO8859_7);
		LABELS.put("elot_928", ISO8859_7);
		LABELS.put("greek", ISO8859_7);
		LABELS.put("greek8", ISO8859_7);
		LABELS.put("iso-8859-7", ISO8859_7);
		LABELS.put("iso-ir-126", ISO8859_7);
		LABELS.put("iso8859-7", ISO8859_7);
		LABELS.put("iso88597", ISO8859_7);
		LABELS.put("iso_8859-7", ISO8859_7);
		LABELS.put("iso_8859-7:1987", ISO8859_7);
		LABELS.put("sun_eu_greek", ISO8859_7);

		LABELS.put("csiso88598e", ISO8859_8);
		LABELS.put("csisolatinhebrew", ISO8859_8);
		LABELS.put("hebrew", ISO8859_8);
		LABELS.put("iso-8859-8", ISO8859_8);
		LABELS.put("iso-8859-8-e", ISO8859_8);
		LABELS.put("iso-ir-138", ISO8859_8);
		LABELS.put("iso8859-8", ISO8859_8);
		LABELS.put("iso88598", ISO8859_8);
		LABELS.put("iso_8859-8", ISO8859_8);
		LABELS.put("iso_8859-8:1988", ISO8859_8);
		LABELS.put("visual", ISO8859_8);

		LABELS.put("csiso88598i", ISO8859_8I);
		LABELS.put("iso-8859-8-i", ISO8859_8I);
		LABELS.put("logical", ISO8859_8I);

		LABELS.put("csisolatin6", ISO8859_10);
		LABELS.put("iso-8859-10", ISO8859_10);
		LABELS.put("iso-ir-157", ISO8859_10);
		LABELS.put("iso8859-10", ISO8859_10);
		LABELS.put("iso885910", ISO8859_10);
		LABELS.put("l6", ISO8859_10);
		LABELS.put("latin6", ISO8859_10);

		LABELS.put("iso-8859-13", ISO8859_13);
		LABELS.put("iso8859-13", ISO8859_13);
		LABELS.put("iso885913", ISO8859_13);

		LABELS.put("iso-8859-14", ISO8859_14);
		LABELS.put("iso8859-14", ISO8859_14);
		LABELS.put("iso885914", ISO8859_14);

		LABELS.put("csisolatin9", ISO8859_15);
		LABELS.put("iso-8859-15", ISO8859_15);
		LABELS.put("iso8859-15", ISO8859_15);
		LABELS.put("iso885915", ISO8859_15);
		LABELS.put("iso_8859-15", ISO8859_15);
		LABELS.put("l9", ISO8859_15);

		LABELS.put("iso-8859-16", ISO8859_16);

		LABELS.put("cskoi8r", KOI8R);
		LABELS.put("koi", KOI8R);
		LABELS.put("koi8", KOI8R);
		LABELS.put("koi8-r", KOI8R);
		LABELS.put("koi8_r", KOI8R);

		LABELS.put("koi8-ru", KOI8U);
		LABELS.put("koi8-u", KOI8U);

		LABELS.put("csmacintosh", MACINTOSH);
		LABELS.put("mac", MACINTOSH);
		LABELS.put("macintosh", MACINTOSH);
		LABELS.put("x-mac-roman", MACINTOSH);

		LABELS.put("dos-874", WINDOWS874);
		LABELS.put("iso-8859-11", WINDOWS874);
		LABELS.put("iso8859-11", WINDOWS874);
		LABELS.put("iso885911", WINDOWS874);
		LABELS.put("tis-620", WINDOWS874);
		LABELS.put("windows-874", WINDOWS874);

		LABELS.put("cp1250", WINDOWS1250);
		LABELS.put("windows-1250", WINDOWS1250);
		LABELS.put("x-cp1250", WINDOWS1250);

		LABELS.put("cp1251", WINDOWS1251);
		LABELS.put("windows-1251", WINDOWS1251);
		LABELS.put("x-cp1251", WINDOWS1251);

		LABELS.put("ansi_x3.4-1968", WINDOWS1252);
		LABELS.put("ascii", WINDOWS1252);
		LABELS.put("cp1252", WINDOWS1252);
		LABELS.put("cp819", WINDOWS1252);
		LABELS.put("csisolatin1", WINDOWS1252);
		LABELS.put("ibm819", WINDOWS1252);
		LABELS.put("iso-8859-1", WINDOWS1252);
		LABELS.put("iso-ir-100", WINDOWS1252);
		LABELS.put("iso8859-1", WINDOWS1252);
		LABELS.put("iso88591", WINDOWS1252);
		LABELS.put("iso_8859-1", WINDOWS1252);
		LABELS.put("iso_8859-1:1987", WINDOWS1252);
		LABELS.put("l1", WINDOWS1252);
		LABELS.put("latin1", WINDOWS1252);
		LABELS.put("us-ascii", WINDOWS1252);
		LABELS.put("windows-1252", WINDOWS1252);
		LABELS.put("x-cp1252", WINDOWS1252);

		LABELS.put("cp1253", WINDOWS1253);
		LABELS.put("windows-1253", WINDOWS1253);
		LABELS.put("x-cp1253", WINDOWS1253);

		LABELS.put("cp1254", WINDOWS1254);
		LABELS.put("csisolatin5", WINDOWS1254);
		LABELS.put("iso-8859-9", WINDOWS1254);
		LABELS.put("iso-ir-148", WINDOWS1254);
		LABELS.put("iso8859-9", WINDOWS1254);
		LABELS.put("iso88599", WINDOWS1254);
		LABELS.put("iso_8859-9", WINDOWS1254);
		LABELS.put("iso_8859-9:1989", WINDOWS1254);
		LABELS.put("l5", WINDOWS1254);
		LABELS.put("latin5", WINDOWS1254);
		LABELS.put("windows-1254", WINDOWS1254);
		LABELS.put("x-cp1254", WINDOWS1254);

		LABELS.put("cp1255", WINDOWS1255);
		LABELS.put("windows-1255", WINDOWS1255);
		LABELS.put("x-cp1255", WINDOWS1255);

		LABELS.put("cp1256", WINDOWS1256);
		LABELS.put("windows-1256", WINDOWS1256);
		LABELS.put("x-cp1256", WINDOWS1256);

		LABELS.put("cp1257", WINDOWS1257);
		LABELS.put("windows-1257", WINDOWS1257);
		LABELS.put("x-cp1257", WINDOWS1257);

		LABELS.put("cp1258", WINDOWS1258);
		LABELS.put("windows-1258", WINDOWS1258);
		LABELS.put("x-cp1258", WINDOWS1258);

		LABELS.put("x-mac-cyrillic", X_MAC_CYRILLIC);
		LABELS.put("x-mac-ukrainian", X_MAC_CYRILLIC);

		LABELS.put("chinese", GBK);
		LABELS.put("csgb2312", GBK);
		LABELS.put("csiso58gb231280", GBK);
		LABELS.put("gb2312", GBK);
		LABELS.put("gb_2312", GBK);
		LABELS.put("gb_2312-80", GBK);
		LABELS.put("gbk", GBK);
		LABELS.put("iso-ir-58", GBK);
		LABELS.put("x-gbk", GBK);

		LABELS.put("gb18030", GB18030);

		LABELS.put("big5", BIG5);
		LABELS.put("big5-hkscs", BIG5);
		LABELS.put("cn-big5", BIG5);
		LABELS.put("csbig5", BIG5);
		LABELS.put("x-x-big5", BIG5);

		LABELS.put("cseucpkdfmtjapanese", EUC_JP);
		LABELS.put("euc-jp", EUC_JP);
		LABELS.put("x-euc-jp", EUC_JP);

		LABELS.put("csiso2022jp", ISO2022_JP);
		LABELS.put("iso-2022-jp", ISO2022_JP);

		LABELS.put("csshiftjis", SHIFT_JIS);
		LABELS.put("ms932", SHIFT_JIS);
		LABELS.put("ms_kanji", SHIFT_JIS);
		LABELS.put("shift-jis", SHIFT_JIS);
		LABELS.put("shift_jis", SHIFT_JIS);
		LABELS.put("sjis", SHIFT_JIS);
		LABELS.put("windows-31j", SHIFT_JIS);
		LABELS.put("x-sjis", SHIFT_JIS);

		LABELS.put("cseuckr", EUC_KR);
		LABELS.put("csksc56011987", EUC_KR);
		LABELS.put("euc-kr", EUC_KR);
		LABELS.put("iso-ir-149", EUC_KR);
		LABELS.put("korean", EUC_KR);
		LABELS.put("ks_c_5601-1987", EUC_KR);
		LABELS.put("ks_c_5601-1989", EUC_KR);
		LABELS.put("ksc5601", EUC_KR);
		LABELS.put("ksc_5601", EUC_KR);
		LABELS.put("windows-949", EUC_KR);

		LABELS.put("csiso2022kr", REPLACEMENT);
		LABELS.put("hz-gb-2312", REPLACEMENT);
		LABELS.put("iso-2022-cn", REPLACEMENT);
		LABELS.put("iso-2022-cn-ext", REPLACEMENT);
		LABELS.put("iso-2022-kr", REPLACEMENT);
		LABELS.put("replacement", REPLACEMENT);

		LABELS.put("unicodefffe", UTF16_BE);
		LABELS.put("utf-16be", UTF16_BE);

		LABELS.put("csunicode", UTF16_LE);
		LABELS.put("iso-10646-ucs-2", UTF16_LE);
		LABELS.put("ucs-2", UTF16_LE);
		LABELS.put("unicode", UTF16_LE);
		LABELS.put("unicodefeff", UTF16_LE);
		LABELS.put("utf-16", UTF16_LE);
		LABELS.put("utf-16le", UTF16_LE);

		LABELS.put("x-user-defined", X_USER_DEFINED);
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#concept-encoding-get">
	 *      Relevant section in Encoding specification</a>
	 * @return An encoding, or null on failure.
	 */
	public static YWEncoding fromLabel(String label) {
		/* S1 *************************************************************************/
		label = YWUtility.removeLeadingAndTrailingWhitespace(label);

		/* S2 *************************************************************************/
		if (LABELS.containsKey(label)) {
			return LABELS.get(label);
		}
		return null;
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#bom-sniff">Relevant section
	 *      in Encoding specification</a>
	 * @return An encoding, or null on failure.
	 */
	private static YWEncoding bomSniff(YWIOQueue queue) {
		int[] bytes = queue.peek(3);
		if (3 <= bytes.length && bytes[0] == 0xef && bytes[1] == 0xbb && bytes[2] == 0xbf) {
			return UTF8;
		} else if (2 <= bytes.length && bytes[0] == 0xfe && bytes[1] == 0xff) {
			return UTF16_BE;
		} else if (2 <= bytes.length && bytes[0] == 0xff && bytes[1] == 0xfe) {
			return UTF16_LE;
		}
		return null;
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#decode"> Relevant section in
	 *      Encoding specification</a>
	 */
	public static YWIOQueue decode(YWIOQueue inputQueue, YWEncoding fallbackEncoding, YWIOQueue output) {
		YWEncoding encoding = fallbackEncoding;
		if (output == null) {
			output = new YWIOQueue();
		}

		/* S1 *************************************************************************/
		YWEncoding bomEncoding = bomSniff(inputQueue);
		/* S2 *************************************************************************/
		if (bomEncoding != null) {
			/* S2.1 ***********************************************************************/
			encoding = bomEncoding;

			/* S2.2 ***********************************************************************/
			if (bomEncoding == UTF8) {
				inputQueue.read(3);
			} else {
				inputQueue.read(2);
			}
		}

		/* S3 *************************************************************************/
		YWEncodingDecoder decoder;
		switch (encoding) {
		case UTF8:
			decoder = new YWUTF8Decoder();
			break;
		default:
			throw new RuntimeException("TODO: Add support for " + encoding + " encoding");
		}
		decoder.processQueue(inputQueue, output, YWEncodingErrorMode.REPLACEMENT);

		/* S4 *************************************************************************/
		return output;
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#decode"> Relevant section in
	 *      Encoding specification</a>
	 */
	public static YWIOQueue decode(YWIOQueue input, YWEncoding fallbackEncoding) {
		return decode(input, fallbackEncoding, null);
	}
}
