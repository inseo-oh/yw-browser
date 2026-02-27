package io.github.inseooh.yw.encoding;

import java.util.ArrayList;
import java.util.List;

public class YWIOQueue {
	public static final int END_OF_IO_QUEUE = -1;

	private final List<Integer> items = new ArrayList<>();

	public static YWIOQueue fromArray(int[] items) {
		YWIOQueue queue = new YWIOQueue();
		for (int item : items) {
			queue.items.add(item);
		}
		return queue;
	}

	private static int[] itemsToArray(List<Integer> items) {
		int[] result = new int[items.size()];
		for (int i = 0; i < result.length; i++) {
			result[i] = items.get(i);
		}
		return result;
	}

	public int[] toArray() {
		return itemsToArray(this.items);
	}

	public String itemsToString() {
		int[] cps = this.toArray();
		StringBuilder result = new StringBuilder();
		for (int cp : cps) {
			result.appendCodePoint(cp);
		}
		return result.toString();
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-stream-read">
	 *      Relevant section in Encoding specification</a>
	 * @return -1 on end of queue, a positive value otherwise.
	 */
	public int read() {
		if (this.items.isEmpty()) {
			return -1;
		}
		int item = this.items.get(0);
		this.items.remove(0);
		return item;
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-stream-read">
	 *      Relevant section in Encoding specification</a>
	 */
	public int[] read(int maxLen) {
		List<Integer> result = new ArrayList<>();
		for (int i = 0; i < maxLen; i++) {
			int item = this.read();
			if (item < END_OF_IO_QUEUE) {
				continue;
			}
			result.add(item);
		}
		return itemsToArray(result);
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-stream-read">
	 *      Relevant section in Encoding specification</a>
	 */
	public int[] peek(int maxLen) {
		List<Integer> result = new ArrayList<>();
		for (int i = 0; i < maxLen; i++) {
			int item = this.items.get(i);
			if (item == END_OF_IO_QUEUE) {
				break;
			}
			result.add(item);
		}
		return itemsToArray(result);
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-stream-push">
	 *      Relevant section in Encoding specification</a>
	 */
	public void push(int item) {
		if (item < END_OF_IO_QUEUE) {
			throw new RuntimeException("attempted to push invalid value");
		}
		this.items.add(item);
	}

	/**
	 * @see <a href="https://encoding.spec.whatwg.org/#concept-stream-push">
	 *      Relevant section in Encoding specification</a>
	 */
	public void push(int[] items) {
		for (int item : items) {
			this.push(item);
		}
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#concept-stream-prepend">
	 *      Relevant section in Encoding specification</a>
	 */
	public void restore(int item) {
		if (item < END_OF_IO_QUEUE) {
			throw new RuntimeException("attempted to restore invalid value");
		}
		this.items.add(0, item);
	}

	/**
	 * @see <a href= "https://encoding.spec.whatwg.org/#concept-stream-prepend">
	 *      Relevant section in Encoding specification</a>
	 */
	public void restore(int[] items) {
		for (int item : items) {
			this.push(item);
		}
	}

}
