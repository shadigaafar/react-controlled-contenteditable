export const getNodeDepthAndIndexes = (
	node: Node | HTMLElement,
	highestParentAttribute: string,
) => {
	if (!node && !highestParentAttribute) return null;
	let searchNode: Node | null = node;
	let attribute =
		node.nodeType === 1
			? (searchNode as HTMLElement)?.getAttribute(
					highestParentAttribute,
			  ) === 'true'
			: false;
	let depth: number = 0;
	let indexes: number[] = [];

	while (!attribute) {
		if (searchNode?.parentElement?.childNodes) {
			//fix
			indexes.push(
				Array.prototype.indexOf.call(
					searchNode?.parentElement?.childNodes,
					searchNode,
				),
			);
		}

		searchNode = searchNode?.parentElement || null;

		if (!searchNode) {
			break;
		}
		if (
			(searchNode as HTMLElement)?.getAttribute(
				highestParentAttribute,
			) === 'true'
		) {
			attribute = true;
		}

		if (depth > 1000) {
			depth = -1; //not found even after 1000 loop
			break;
		}
		depth++;
	}
	return {depth, indexes: indexes.reverse()};
};

const getNestedNodeByIndexesAndDepth = (
	element: Element,
	indexes: number[],
	depth: number,
) => {
	if (indexes.length > 0 && depth < 0 && !Element) return null;

	let node: Node = element;
	let currentDepth = 0;

	while (currentDepth !== depth) {
		node = node?.childNodes[indexes[currentDepth]];
		currentDepth++;

		if (currentDepth > 10000) {
			break;
		}
	}

	return node;
};

export const getMatchedContainer = (
	contentEditable: HTMLElement,
	startContainerPos: {
		indexes: number[];
		depth: number;
	},
) => {
	const {depth, indexes} = startContainerPos;

	return getNestedNodeByIndexesAndDepth(contentEditable, indexes, depth);
};

export const getRange = () => {
	const sel = document.getSelection();
	if (typeof sel?.rangeCount === 'undefined') return;
	const range = sel.rangeCount > 0 ? sel?.getRangeAt(0) : null;
	return range;
};
