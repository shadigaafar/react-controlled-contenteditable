import React, {useRef, useState, useCallback, useLayoutEffect} from 'react';
import {KeyDownEvent} from '.';

const getNodeDepthAndIndexes = (
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
const matchContainer = (
	contentEditable: HTMLElement,
	startContainerPos: {
		indexes: number[];
		depth: number;
	},
) => {
	const {depth, indexes} = startContainerPos;

	return getNestedNodeByIndexesAndDepth(contentEditable, indexes, depth);
};

const formattingElsAndAnchorElement = [
	'EM',
	'B',
	'STRONG',
	'I',
	'U',
	'MARK',
	'SMALL',
	'DEL',
	'INS',
	'SUB',
	'TT',
	'BIG',
	'A',
];
const getRange = () => {
	const sel = document.getSelection();
	if (typeof sel?.rangeCount === 'undefined') return;
	const range = sel.rangeCount > 0 ? sel?.getRangeAt(0) : null;
	return range;
};

const getAnyMainParentIncluded = (node: Node | HTMLElement, list: string[]) => {
	let parent: Node | HTMLElement | null = node;

	if (!parent?.parentElement) return;

	let isParentFormattingElement = list.includes(
		parent.parentElement?.tagName || '',
	);

	while (isParentFormattingElement) {
		const pare: HTMLElement | null = parent?.parentElement || null;
		if (
			list.includes((pare as HTMLElement).tagName) &&
			!(pare as HTMLElement)?.parentElement?.hasAttribute(
				'contenteditable',
			)
		) {
			parent = pare;
		} else {
			isParentFormattingElement = false;
		}
	}
	if (!list.includes((parent as Element)?.tagName || '')) {
		return null;
	}
	return parent;
};

const getMainHTMLFormattingOrAnchorElement = (node: Node | HTMLElement) => {
	return getAnyMainParentIncluded(node, formattingElsAndAnchorElement);
};

interface CaretPosition {
	endOffset: number;
	startOffset: number;
	startContainerPos: {
		indexes: number[];
		depth: number;
	};
	endContainerPos: {
		indexes: number[];
		depth: number;
	};
}

const useCaretPositioning = () => {
	const refElement = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState<string>(
		'We hope you are enjoying <b>React Controlled Contenteditable</b>, if you find and issue please report it',
	);
	const [caretPosition, setCaretPosition] = useState<CaretPosition>();

	const isPaste = useRef(false);
	const saveRange = useCallback(() => {
		const range = getRange();
		if (range) {
			const startContainerPos = getNodeDepthAndIndexes(
				range.startContainer,
				'contenteditable',
			);
			const endContainerPos = getNodeDepthAndIndexes(
				range.endContainer,
				'contenteditable',
			);
			if (!startContainerPos || !endContainerPos) return;
			setCaretPosition({
				endOffset: range.endOffset,
				startOffset: range.startOffset,
				startContainerPos,
				endContainerPos,
			});
		}
	}, []);

	const getMatchedContainer = useCallback(() => {
		if (!caretPosition || !refElement.current)
			return {start: null, end: null};

		const end = matchContainer(
			refElement.current,
			caretPosition.endContainerPos,
		);
		const start = matchContainer(
			refElement.current,
			caretPosition.startContainerPos,
		);

		return {start, end};
	}, [caretPosition]);

	const restoreCaretPosition = useCallback(() => {
		const sel = document.getSelection();

		const range = new Range();

		if (caretPosition) {
			const matchedEndContainer = getMatchedContainer()?.end;
			const matchedStartContainer = getMatchedContainer()?.start;

			if (matchedEndContainer && matchedStartContainer) {
				range.setStart(
					matchedStartContainer,
					caretPosition.startOffset,
				);
				range.setEnd(matchedEndContainer, caretPosition.endOffset);
				if (isPaste.current) {
					range.setEnd(
						matchedStartContainer,
						caretPosition.startOffset,
					);
					isPaste.current = false;
				}
			}
			sel?.removeAllRanges();
			sel?.addRange(range);
		}
	}, [caretPosition, getMatchedContainer]);

	const triggerInput = () => {
		const ev = new Event('input', {
			bubbles: true,
			cancelable: true,
		});
		refElement.current?.dispatchEvent(ev);
	};

	const navigateThroughNestedElementsOnArrowKeys = useCallback(
		(arrowDir: 'right' | 'left', e: KeyDownEvent) => {
			if (
				refElement.current &&
				getComputedStyle(refElement.current as Element).direction ===
					'rtl'
			) {
				arrowDir = arrowDir === 'right' ? 'left' : 'right';
			}
			const sel = document.getSelection();
			const range = getRange();

			if (!range) return;
			const matchedEndContainer = range?.endContainer;

			const getClosetParentWithManyChildNodes = () => {
				let parentElement = matchedEndContainer as Element;
				let indexOfEndContainer = Array.prototype.indexOf.call(
					parentElement?.childNodes,
					matchedEndContainer,
				);

				let i = 0;
				while (!parentElement?.childNodes[indexOfEndContainer + 1]) {
					const prevParent = parentElement;
					if (parentElement?.parentElement)
						parentElement = parentElement?.parentElement;

					indexOfEndContainer = Array.prototype.indexOf.call(
						parentElement?.childNodes,
						prevParent,
					);
					if (
						parentElement.nodeType === 1 &&
						parentElement?.hasAttribute('contenteditable')
					) {
						break;
					}
					if (i > 1000) {
						break; //escape infinite loop
					}
				}
				return {
					parentElement,
					focusedContainerIndex: indexOfEndContainer,
				};
			};
			const {parentElement, focusedContainerIndex} =
				getClosetParentWithManyChildNodes();

			//case we are not navigating around formatting element or anchor should do nothing;
			if (range?.endContainer.nodeType === 1) {
				const nextContainer =
					range?.endContainer.childNodes[range.endOffset + 1];
				const hasNextContainer = !!nextContainer;
				const prevContainer =
					range?.endContainer.childNodes[range.endOffset - 1];
				const hasPrevContainer = !!prevContainer;
				if (
					(arrowDir === 'right' && !hasNextContainer) ||
					(arrowDir === 'left' && !hasPrevContainer)
				) {
					return;
				}
				if (
					(arrowDir === 'right' &&
						nextContainer.nodeType === 1 &&
						!getMainHTMLFormattingOrAnchorElement(nextContainer)) ||
					(arrowDir === 'left' &&
						prevContainer.nodeType === 1 &&
						!getMainHTMLFormattingOrAnchorElement(prevContainer))
				) {
					return;
				}
			} else {
				//if text node
				const nextContainer =
					parentElement?.childNodes[focusedContainerIndex + 1];
				const prevContainer =
					parentElement?.childNodes[focusedContainerIndex - 1];

				if (
					(arrowDir === 'right' && !nextContainer) ||
					(arrowDir === 'left' && !prevContainer)
				) {
					return;
				}

				if (
					(arrowDir === 'right' &&
						nextContainer?.nodeType === 1 &&
						(nextContainer as Element).tagName !== 'BR' &&
						!getMainHTMLFormattingOrAnchorElement(nextContainer)) ||
					(arrowDir === 'left' &&
						prevContainer?.nodeType === 1 &&
						(prevContainer as Element).tagName !== 'BR' &&
						!getMainHTMLFormattingOrAnchorElement(prevContainer))
				) {
					return;
				}
			}

			const nextElement =
				parentElement.childNodes[focusedContainerIndex + 1];
			const isNextElementBR =
				(parentElement.childNodes[focusedContainerIndex + 1] as Element)
					?.tagName === 'BR';
			if (
				range &&
				(matchedEndContainer?.textContent?.length || 0) - 1 ===
					range?.endOffset &&
				arrowDir === 'right' &&
				isNextElementBR
			) {
				e.preventDefault();
				range.setStartAfter(nextElement);
				range.setEndAfter(nextElement);
			}
			//when at the end or start of container
			if (
				range &&
				arrowDir === 'right' &&
				(matchedEndContainer?.textContent?.length ===
					range?.endOffset ||
					matchedEndContainer?.nodeType === 1)
			) {
				e.preventDefault();

				if (matchedEndContainer?.nodeType === 1) {
					const container =
						matchedEndContainer.childNodes[range.endOffset];
					range.setStart(container, 0);
					range.setEnd(container, 0);
				} else {
					console.log(range.endOffset);
					if (!parentElement) return;
					const nextContainer =
						parentElement.childNodes[focusedContainerIndex + 1];
					range.setStart(nextContainer, 0);
					range.setEnd(nextContainer, 0);
				}

				sel?.removeAllRanges();
				sel?.addRange(range);
			} else if (
				//at the beginning of container
				range &&
				arrowDir === 'left' &&
				(range?.endContainer.nodeType === 1 ||
					((range?.endOffset === 0 || range.endOffset === 1) &&
						range.endContainer.nodeType === 3))
			) {
				e.preventDefault();

				//case text node and at offset 1 move offset to 0 on arrow left
				if (
					range?.endOffset === 1 &&
					range.endContainer.nodeType === 3
				) {
					range.setStart(range.endContainer, 0);
					range.setEnd(range.endContainer, 0);
				} else {
					let prevNodeContainer =
						parentElement?.childNodes[focusedContainerIndex - 1];
					let i = 0;
					//case prevNode is BR Element
					if (
						prevNodeContainer.nodeType === 1 &&
						(prevNodeContainer as Element).tagName === 'BR'
					) {
						range.setStartAfter(prevNodeContainer);
						range.setEndAfter(prevNodeContainer);
					} else {
						//digging for text node
						while (prevNodeContainer?.nodeType === 1) {
							if (prevNodeContainer.lastChild) {
								prevNodeContainer = prevNodeContainer.lastChild;
							} else {
								break;
							}
							if (i > 1000) {
								break;
							}
						}

						const length = prevNodeContainer?.textContent?.length;
						if (!length || !prevNodeContainer) return;
						range.setStart(prevNodeContainer, length);
						range.setEnd(prevNodeContainer, length);
					}
				}

				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		},
		[],
	);

	const jumpOutsideFormattingElementWhenAtEndContainer = useCallback(() => {
		const range = getRange();
		const selection = document.getSelection();
		const matchedEndContainer = range?.endContainer;

		if (
			range?.endContainer?.textContent !==
				range?.startContainer.textContent ||
			range?.startOffset !== range?.endOffset
		)
			return;

		if (!refElement.current || !matchedEndContainer || !range) return;
		const mainFormattingElement = matchedEndContainer.parentElement;
		const mainElement = mainFormattingElement?.parentElement;
		if (
			getMainHTMLFormattingOrAnchorElement(matchedEndContainer)
				?.nodeType === 1 &&
			matchedEndContainer.textContent?.length === range.endOffset
		) {
			if (!mainFormattingElement || !mainElement) return;
			if (mainFormattingElement?.nextSibling) {
				const indexOfMainFormattingElement =
					Array.prototype.indexOf.call(
						mainElement.childNodes,
						mainFormattingElement,
					);
				//set Caret position after html formatting element
				const nextSibling =
					mainElement.childNodes[indexOfMainFormattingElement + 1];

				if (!nextSibling) return;
				range.setStart(nextSibling, 0);
				range.setEnd(nextSibling, 0);
			} else {
				const indexOfMainFormattingElement =
					Array.prototype.indexOf.call(
						mainElement.childNodes,
						mainFormattingElement,
					);
				range.setStart(mainElement, indexOfMainFormattingElement + 1);
				range.setEnd(mainElement, indexOfMainFormattingElement + 1);
			}

			range.collapse();

			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}, []);

	const moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR =
		useCallback(() => {
			const range = getRange();
			const selection = document.getSelection();
			const matchedEndContainer = range?.endContainer;

			if (
				range?.endContainer?.textContent !==
					range?.startContainer.textContent ||
				range?.startOffset !== range?.endOffset
			)
				return;

			if (!refElement.current || !matchedEndContainer || !range) return;
			const mainFormattingElement = matchedEndContainer.parentElement;
			const mainElement = mainFormattingElement?.parentElement;
			if (
				getMainHTMLFormattingOrAnchorElement(matchedEndContainer)
					?.nodeType === 1 &&
				range.startOffset === 0
			) {
				const indexOfMainFormattingElement =
					Array.prototype.indexOf.call(
						mainElement?.childNodes,
						mainFormattingElement,
					);
				//set Caret position after html formatting element
				const prevSibling =
					mainElement?.childNodes[indexOfMainFormattingElement - 1];
				if (prevSibling && (prevSibling as Element).tagName === 'BR') {
					range.setStartAfter(prevSibling);
					range.setEndAfter(prevSibling);
					selection?.removeAllRanges();
					selection?.addRange(range);
				}
			}
		}, []);

	const inputCharManuallyWhenCaretAtStartOrEndTextOrBtwnFormattingElements =
		useCallback(
			(e: React.CompositionEvent | InputEvent) => {
				const compositionEvent = e as React.CompositionEvent;
				const keyDownEvent = e as InputEvent;
				const sel = getSelection();
				const range = getRange();

				if (
					range?.endContainer?.textContent !==
						range?.startContainer.textContent ||
					range?.startOffset !== range?.endOffset
				)
					return;
				let newValue = keyDownEvent?.data || compositionEvent?.data;
				//checking if caret at the end of container or at the beginning
				if (
					range &&
					(range?.endContainer.textContent?.length ===
						range.endOffset ||
						range?.endContainer.nodeType === 1 ||
						range.endOffset === 0)
				) {
					if (!newValue && !/\s/g.test(newValue)) return;
					newValue = /\s/g.test(newValue)
						? 'white_space_&nbsp;'
						: newValue;

					e.preventDefault();

					if (range.endContainer.nodeType !== 1) {
						//it is a node caret at the beginning of container
						if (range.endOffset === 0) {
							const content = range.endContainer.textContent;
							const newContent = newValue + content;

							range.endContainer.nodeValue = newContent;

							range.setStart(range.endContainer, 1);
							range.setEnd(range.endContainer, 1);
						} else {
							//it is a node caret at the end of container
							const content = range.endContainer.textContent;
							const newContent = content + newValue;

							range.endContainer.nodeValue = newContent;
							const endOffset =
								newValue === 'white_space_&nbsp;'
									? (content?.length || 0) + 1
									: newContent.length;
							range.setStart(range.endContainer, endOffset);
							range.setEnd(range.endContainer, endOffset);
						}
					} else {
						const newTextNode = document.createTextNode(newValue);

						const isAfterBR =
							(
								range?.endContainer.childNodes[
									range?.endOffset - 1
								] as Element
							)?.tagName === 'BR';

						const prev = range?.endContainer.childNodes[
							range?.endOffset - 1
						] as Element;
						const next = range?.endContainer.childNodes[
							range?.endOffset + 1
						] as Element;

						let current = range?.endContainer.childNodes[
							range?.endOffset
						] as Node;

						const isBetweenFormattingElements =
							formattingElsAndAnchorElement.includes(
								prev?.tagName,
							) &&
							formattingElsAndAnchorElement.includes(
								next?.tagName,
							);

						if (
							!current &&
							(range?.endContainer as HTMLElement).getAttribute(
								'contenteditable',
							) === 'true'
						) {
							range.insertNode(newTextNode);
							range.setStart(range.endContainer, 1);
							range.setEnd(range.endContainer, 1);
						} else if (
							(isAfterBR && next) ||
							isBetweenFormattingElements
						) {
							//case caret between formatting element or after BR element that has next sibling
							range.insertNode(newTextNode);
							range.setStart(newTextNode, 1);
							range.setEnd(newTextNode, 1);
						}
						//case caret before BR element and no next sibling
						else if (
							!next &&
							(current as Element)?.tagName === 'BR'
						) {
							const parent = current.parentElement;
							parent?.removeChild(current);
							parent?.append(newTextNode);
							range.setStart(newTextNode, 1);
							range.setEnd(newTextNode, 1);
						} else {
							let i = 0;
							// digging for text node
							while (current?.nodeType === 1) {
								if (current.firstChild) {
									current = current.firstChild;
								} else {
									break;
								}
								if (i > 1000) {
									break;
								}
								i++;
							}
							current.nodeValue = newValue + current.nodeValue;
							range.setStart(current, 1);
							range.setEnd(current, 1);
						}
					}

					sel?.removeAllRanges();
					sel?.addRange(range);
					saveRange();
					//translate whitespace
					if (refElement.current?.innerHTML) {
						refElement.current.innerHTML =
							refElement.current?.innerHTML.replaceAll(
								'white_space_&amp;nbsp;',
								'&nbsp;',
							);
					}

					setTimeout(triggerInput, 0);
				}
			},
			[saveRange],
		);

	const correctInputDataContainerIME = useCallback(
		(e: React.CompositionEvent) => {
			const sel = document.getSelection();
			const range = getRange();
			const currentEndContainer = range?.endContainer;
			const currentEndOffset = range?.endOffset;
			const originalEndContainer = getMatchedContainer()?.end || null;
			const originalEndOffset = caretPosition?.endOffset;

			//if whole text is being selected do nothing
			if (originalEndOffset !== caretPosition?.startOffset) return;

			//check if current end container is not equal original container
			if (
				range &&
				originalEndContainer &&
				currentEndContainer &&
				currentEndOffset &&
				typeof originalEndOffset === 'number' &&
				!currentEndContainer?.isEqualNode(originalEndContainer)
			) {
				const dataLength = e.data.length;

				const newInputDataStartOffset = Math.abs(
					dataLength - currentEndOffset,
				);

				const newInputDataEndOffset = currentEndOffset;

				range.selectNodeContents(currentEndContainer);
				//select input data
				range.setStart(currentEndContainer, newInputDataStartOffset);
				range.setEnd(currentEndContainer, newInputDataEndOffset);

				const newInputData = range.extractContents().textContent;
				const newInputDataNode = document.createTextNode(
					newInputData || '',
				);
				//now we need to move the new input data to the original container
				range.setStart(originalEndContainer, originalEndOffset);
				range.setEnd(originalEndContainer, originalEndOffset);

				if (originalEndContainer.nodeType === 1) {
					range.insertNode(newInputDataNode);
					//move caret to the end of the newly input data
					range.setStart(newInputDataNode, dataLength);
					range.setEnd(newInputDataNode, dataLength);
				} else {
					//if caret at the end of container
					if (
						originalEndOffset ===
						(originalEndContainer as Text).length
					) {
						originalEndContainer.nodeValue =
							(originalEndContainer.nodeValue || '') +
							newInputData;
						//move caret to the end of the newly entered data
						const containerLength = (originalEndContainer as Text)
							.length;
						range.setStart(originalEndContainer, containerLength);
						range.setEnd(originalEndContainer, containerLength);
					} else {
						originalEndContainer.nodeValue =
							newInputData +
							(originalEndContainer.nodeValue || '');
						range.setStart(originalEndContainer, dataLength);
						range.setEnd(originalEndContainer, dataLength);
					}
				}

				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		},
		[caretPosition, getMatchedContainer],
	);

	const handleInputIME = (e: React.CompositionEvent) => {
		const content = (e.target as HTMLElement).innerHTML;
		correctInputDataContainerIME(e);
		saveRange();
		setContent(content);
	};
	const handleInput = (e: React.SyntheticEvent<HTMLElement>) => {
		const content = (e.target as HTMLElement).innerHTML;
		saveRange();
		setContent(content);
	};

	useLayoutEffect(() => {
		restoreCaretPosition();
	}, [restoreCaretPosition]);

	const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLElement>) => {},
	[]);
	const handleKeyDown = useCallback(
		(e: KeyDownEvent) => {
			if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
				navigateThroughNestedElementsOnArrowKeys(
					e.key === 'ArrowLeft' ? 'left' : 'right',
					e,
				);
			}
			if (e.shiftKey && e.key === 'Enter') {
				setTimeout(
					moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR,
					0,
				);
			}
		},
		[
			navigateThroughNestedElementsOnArrowKeys,
			moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR,
		],
	);

	const handleCompositionStart = useCallback(
		(_e: React.CompositionEvent) => {
			saveRange();
		},
		[saveRange],
	);

	useLayoutEffect(() => {
		const el = refElement.current;

		const handleInput = (e: InputEvent) => {
			if (!e.isComposing) {
				inputCharManuallyWhenCaretAtStartOrEndTextOrBtwnFormattingElements(
					e,
				);
			}
		};

		const handleOnClick = (_e: MouseEvent) => {
			moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR();
			jumpOutsideFormattingElementWhenAtEndContainer();
		};

		const handleOnPaste = (_e: ClipboardEvent) => {
			isPaste.current = true;
		};

		el?.addEventListener('paste', handleOnPaste);
		el?.addEventListener('click', handleOnClick);
		el?.addEventListener('beforeinput', handleInput);

		return () => {
			el?.removeEventListener('paste', handleOnPaste);
			el?.removeEventListener('click', handleOnClick);
			el?.removeEventListener('beforeinput', handleInput);
		};
	}, [
		jumpOutsideFormattingElementWhenAtEndContainer,
		moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR,
		inputCharManuallyWhenCaretAtStartOrEndTextOrBtwnFormattingElements,
	]);
	return {
		refElement,
		content,
		setContent,
		handleKeyUp,
		handleKeyDown,
		handleInput,
		handleInputIME,
		handleCompositionStart,
	};
};
export default useCaretPositioning;
