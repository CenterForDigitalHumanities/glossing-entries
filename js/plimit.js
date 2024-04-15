import Queue from './yocto.js';
/**
 * Creates a concurrency-limited control function that manages execution of multiple asynchronous operations.
 * This is useful for regulating the number of operations that can run simultaneously, preventing resource overuse.
 *
 * @param {number} concurrency - The maximum number of concurrent operations allowed. This must be a positive integer or `Number.POSITIVE_INFINITY` for no limit.
 * @returns {Function} A generator function that can be used to add asynchronous tasks to be controlled by the concurrency limit.
 *
 * @throws {TypeError} If the `concurrency` argument is not a positive integer or `Number.POSITIVE_INFINITY`.
 *
 * @example
 * // Example usage:
 * import pLimit from './pLimit.js';
 *
 * const limit = pLimit(2); // Only two operations will run concurrently.
 *
 * // Function that returns a promise.
 * const doSomething = (value) => new Promise(resolve => setTimeout(resolve, 1000, value));
 *
 * async function processArray(array) {
 *   const results = await Promise.all(array.map(item => limit(() => doSomething(item))));
 *   console.log(results);
 * }
 *
 * // This will only execute two promises at a time.
 * processArray([1, 2, 3, 4]);
 */
export default function pLimit(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (fn, resolve, args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (fn, resolve, args) => {
		queue.enqueue(run.bind(undefined, fn, resolve, args));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (fn, ...args) => new Promise(resolve => {
		enqueue(fn, resolve, args);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value: () => {
				queue.clear();
			},
		},
	});

	return generator;
}
