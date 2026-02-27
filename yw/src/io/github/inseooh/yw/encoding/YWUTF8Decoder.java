package io.github.inseooh.yw.encoding;

/**
 * @see <a href="https://encoding.spec.whatwg.org/#utf-8-decoder">Relevant
 *      section in Encoding specification</a>
 */
public class YWUTF8Decoder extends YWEncodingDecoder {
	private int codepoint = 0;
	private int bytesSeen = 0;
	private int bytesNeeded = 0;
	private int lowerBoundary = 0x80;
	private int upperBoundary = 0xbf;

	@Override
	protected YWEncodingResult handler(YWIOQueue queue, int byteItem) {
		if (byteItem == YWIOQueue.END_OF_IO_QUEUE) {
			if (this.bytesNeeded != 0) {
				this.bytesNeeded = 0;
				return YWEncodingResult.ERROR;
			}
			return YWEncodingResult.FINISHED;
		}
		if (this.bytesNeeded == 0) {
			if (byteItem <= 0x7f) {
				YWEncodingResult res = YWEncodingResult.ITEMS;
				res.setItems(new int[] { byteItem });
				return res;
			} else if (0xc2 <= byteItem && byteItem <= 0xdf) {
				this.bytesNeeded = 1;
				this.codepoint = byteItem & 0x1f;
			} else if (0xe0 <= byteItem && byteItem <= 0xef) {
				switch (byteItem) {
				case 0xe0:
					this.lowerBoundary = 0xa0;
					break;
				case 0xed:
					this.upperBoundary = 0x9f;
					break;
				}
				this.bytesNeeded = 2;
				this.codepoint = byteItem & 0xf;
			} else if (0xf0 <= byteItem && byteItem <= 0xf4) {
				switch (byteItem) {
				case 0xf0:
					this.lowerBoundary = 0x90;
					break;
				case 0xf4:
					this.upperBoundary = 0x8f;
					break;
				}
				this.bytesNeeded = 3;
				this.codepoint = byteItem & 0x7;
			} else {
				return YWEncodingResult.ERROR;
			}
			return YWEncodingResult.CONTINUE;
		}
		if (byteItem < this.lowerBoundary || this.upperBoundary < byteItem) {
			this.codepoint = 0;
			this.bytesNeeded = 0;
			this.bytesSeen = 0;
			this.lowerBoundary = 0x80;
			this.upperBoundary = 0xbf;
			queue.restore(byteItem);
			return YWEncodingResult.ERROR;
		}
		this.lowerBoundary = 0x80;
		this.upperBoundary = 0xbf;
		this.codepoint = (this.codepoint << 6) | (byteItem & 0x3f);
		this.bytesSeen++;
		if (this.bytesSeen != this.bytesNeeded) {
			return YWEncodingResult.CONTINUE;
		}
		int cp = this.codepoint;
		this.codepoint = 0;
		this.bytesNeeded = 0;
		this.bytesSeen = 0;
		YWEncodingResult res = YWEncodingResult.ITEMS;
		res.setItems(new int[] { cp });
		return res;
	}
}
