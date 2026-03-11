package io.github.inseooh.yw.encoding;

import java.util.Arrays;

public abstract class YWEncodingDecoder extends YWEncodingProcessor {
	public YWEncodingDecoder() {
		super(Kind.DECODER);
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8Decode(YWIOQueue ioQueue, YWIOQueue output) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.11.)

		// S1.
		int[] buffer = ioQueue.peek(3);

		// S2.
		if (Arrays.equals(buffer, new int[] { 0xef, 0xbb, 0xbf })) {
			ioQueue.read(3);
		}

		// S3.
		(new YWUTF8Decoder()).processQueue(ioQueue, output, YWEncodingErrorMode.REPLACEMENT);

		// S4.
		return output;
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8Decode(YWIOQueue ioQueue) {
		return utf8Decode(ioQueue, new YWIOQueue());
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode-without-bom">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8DecodeWithoutBOM(YWIOQueue ioQueue, YWIOQueue output) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.11.)

		// S1.
		(new YWUTF8Decoder()).processQueue(ioQueue, output, YWEncodingErrorMode.REPLACEMENT);

		// S2.
		return output;
	}

	/**
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode-without-bom">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8DecodeWithoutBOM(YWIOQueue ioQueue) {
		return utf8DecodeWithoutBOM(ioQueue, new YWIOQueue());
	}

	/**
	 * @return null on failure.
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode-without-bom-or-fail">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8DecodeWithoutBOMOrFail(YWIOQueue ioQueue, YWIOQueue output) {
		// NOTE: All the step numbers(S#.) are based on spec from when this was
		// initially written(2026.03.11.)

		// S1.
		YWEncodingResult potentialError = (new YWUTF8Decoder()).processQueue(ioQueue, output,
				YWEncodingErrorMode.FATAL);

		// S2.
		if (potentialError == YWEncodingResult.ERROR) {
			return null;
		}

		// S3.
		return output;
	}

		/**
	 * @return null on failure.
	 * @see <a href=
	 *      "https://encoding.spec.whatwg.org/#utf-8-decode-without-bom-or-fail">
	 *      Relevant section in Encoding specification</a>
	 */
	public static YWIOQueue utf8DecodeWithoutBOMOrFail(YWIOQueue ioQueue) {
		return utf8DecodeWithoutBOMOrFail(ioQueue, new YWIOQueue());
	}
}
