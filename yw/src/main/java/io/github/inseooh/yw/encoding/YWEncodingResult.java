package io.github.inseooh.yw.encoding;

/**
 * @apiNote for {@link YWEncodingResult#ITEMS} variant,
 *          {@link YWEncodingResult#items} field also must be set.
 * @see <a href="https://encoding.spec.whatwg.org/#handler">Relevant section in
 *      Encoding specification</a>
 */
public enum YWEncodingResult {
	ERROR, FINISHED, CONTINUE, ITEMS;

	private int[] items;

	public void setItems(int[] items) {
		if (this != ITEMS) {
			throw new RuntimeException("this must be ITEMS variant");
		}
		this.items = items;
	}

	public int[] getItems() {
		if (this != ITEMS) {
			throw new RuntimeException("this must be ITEMS variant");
		}
		return this.items;
	}

}
