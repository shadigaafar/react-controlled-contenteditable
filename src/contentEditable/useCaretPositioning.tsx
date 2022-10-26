import React, {useRef, useState, useCallback, useLayoutEffect} from 'react';
import {KeyDownEvent} from '.';
import useUndo from './useUndo';
import {getRange} from './common';
import useSaveRestoreRange from './useSaveRestoreRange';

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

const getFirstTextNode = (element: Node) => {
	let textNode = element;

	while (textNode?.firstChild) {
		textNode = textNode.firstChild;
	}

	return textNode as Text | Node;
};
const getAnyMainParentIncluded = (node: Node | HTMLElement, list: string[]) => {
	let parent: Node | HTMLElement | null = node;

	if (!parent?.parentElement) return null;

	let isParentAnyOfList = list.includes(parent.parentElement?.tagName || '');

	while (isParentAnyOfList) {
		const pare: HTMLElement | null = parent?.parentElement || null;
		if (
			list.includes((pare as HTMLElement).tagName) &&
			!(pare as HTMLElement)?.hasAttribute('contenteditable')
		) {
			parent = pare;
		} else {
			isParentAnyOfList = false;
		}
	}
	if (list.includes((parent as Element)?.tagName || '') === false) {
		return null;
	}

	return parent;
};

const getMainHTMLFormattingOrAnchorElement = (node: Node | HTMLElement) => {
	return getAnyMainParentIncluded(node, formattingElsAndAnchorElement);
};

const getNeighboringNode = (node: Node, endOffset: number) => {
	let prev: Node | null = null;
	let next: Node | null = null;
	let current: Node | null = null;

	let parent = node.nodeType === 1 ? node.childNodes[endOffset] : node;
	let hasNoSibling = true;
	let i = 0;
	while (hasNoSibling) {
		if (next && prev) {
			hasNoSibling = false;
			break;
		}

		if (next === null && parent?.nextSibling) {
			const indexOfNext = Array.prototype.indexOf.call(
				parent?.parentElement?.childNodes,
				parent.nextSibling,
			);
			if (!current) {
				current = parent;
			}

			next = parent.parentElement?.childNodes[indexOfNext] || null;
		}
		if (prev === null && parent?.previousSibling) {
			const indexOfPrev = Array.prototype.indexOf.call(
				parent?.parentElement?.childNodes,
				parent.previousSibling,
			);
			if (!current) {
				current = parent;
			}

			prev = parent.parentElement?.childNodes[indexOfPrev] || null;
		}

		parent = parent?.parentElement as Node;

		if ((parent as Element)?.hasAttribute('contenteditable')) {
			break;
		}
		if (i > 1000) {
			break;
		}
		i++;
	}
	return {prev, next, current};
};

const useCaretPositioning = () => {
	const refElement = useRef<HTMLDivElement>(null);
	const [content, setContent] = useState<string>('');
	const {
		saveRange,
		restoreCaretPosition,
		getMatchedContainers,
		caretPosition,
		setCaretPosition,
	} = useSaveRestoreRange(refElement.current as HTMLElement);
	const isCaretAfterBR = useRef(false);
	const undoState = useUndo(refElement.current as HTMLElement);

	const triggerInput = () => {
		const ev = new Event('input', {
			bubbles: true,
			cancelable: true,
		});
		refElement.current?.dispatchEvent(ev);
	};

	const navigateThroughNestedElementsOnArrowKeys = useCallback(
		(e: KeyDownEvent) => {
			let arrowDir =
				e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? e.key : null;
			if (!arrowDir) return;
			if (
				refElement.current &&
				getComputedStyle(refElement.current as Element).direction ===
					'rtl'
			) {
				arrowDir = arrowDir === 'right' ? 'left' : 'right';
			}
			const sel = document.getSelection();
			const range = getRange();

			const endContainer = range?.endContainer;
			const endOffset = range?.endOffset;
			if (!range || !endContainer || typeof endOffset === 'undefined')
				return;

			const {prev, next, current} = getNeighboringNode(
				endContainer,
				endOffset,
			);

			if (!prev && !next) return;
			const isAtEnd =
				endContainer?.textContent?.length === range?.endOffset;

			const isAtStart =
				endOffset === 0 ||
				endOffset === 1 ||
				endContainer?.nodeType === 1;

			const isCurrentFormattingEls =
				!!getMainHTMLFormattingOrAnchorElement(endContainer);
			const isNextFormattingEls = !!getMainHTMLFormattingOrAnchorElement(
				next as Node,
			);
			const isPrevFormattingEls = !!getMainHTMLFormattingOrAnchorElement(
				prev as Node,
			);

			const isNavigatingThroughFormattingEls =
				(isCurrentFormattingEls ||
					isNextFormattingEls ||
					isPrevFormattingEls) &&
				(isAtStart || isAtEnd);

			if (
				next &&
				isAtEnd &&
				arrowDir === 'right' &&
				(next as Element)?.tagName === 'BR' &&
				isCaretAfterBR.current === false
			) {
				e.preventDefault();
				range.setStartAfter(next);
				range.setEndAfter(next);
				sel?.removeAllRanges();
				sel?.addRange(range);
				isCaretAfterBR.current = true;
			} else if (
				arrowDir === 'right' &&
				current?.previousSibling &&
				isCaretAfterBR.current === true
			) {
				e.preventDefault();
				range.setStart(current, 0);
				range.setEnd(current, 0);
				sel?.removeAllRanges();
				sel?.addRange(range);
			}

			if (!isNavigatingThroughFormattingEls) return;

			if (
				(arrowDir === 'right' && !next) ||
				(arrowDir === 'left' && !prev)
			)
				return;

			if (current && next && arrowDir === 'right' && isAtEnd) {
				e.preventDefault();

				if (current.nodeType !== 1 || next.nodeType !== 1) {
					range.setStart(getFirstTextNode(next), 0);
					range.setEnd(getFirstTextNode(next), 0);
				} else {
					range.setStartAfter(current);
					range.setEndAfter(current);
				}
			} else if (
				current &&
				arrowDir === 'right' &&
				range?.endContainer.nodeType === 1
			) {
				e.preventDefault();
				range.setStart(getFirstTextNode(current), 0);
				range.setEnd(getFirstTextNode(current), 0);
			}

			if (current && prev && arrowDir === 'left' && isAtStart) {
				e.preventDefault();
				const prevLength =
					prev.nodeType === 1
						? (prev as Element).childNodes?.length
						: (prev as Text).length;
				const prevContainer = prev.childNodes[prevLength - 1];

				if (range.endContainer.nodeType !== 1 && endOffset === 1) {
					range.setStart(endContainer, 0);
					range.setEnd(endContainer, 0);
				} else {
					if (
						(current.nodeType !== 1 && prev.nodeType === 1) ||
						(current?.nodeType === 1 &&
							prev.nodeType === 1 &&
							range.endOffset !== 0)
					) {
						range.setStart(
							prevContainer,
							(prevContainer as Text).length,
						);
						range.setEnd(
							prevContainer,
							(prevContainer as Text).length,
						);
					} else if (
						current?.nodeType === 1 &&
						range?.endContainer.nodeType !== 1 &&
						prev.nodeType === 1
					) {
						range.setStartBefore(current);
						range.setEndBefore(current);
					} else {
						if (
							(prev as Element).tagName === 'BR' &&
							isCaretAfterBR.current === false
						) {
							range.setStartAfter(prev);
							range.setEndAfter(prev);
							isCaretAfterBR.current = true;
						} else {
							range.setStart(prev, (prev as Text).length);
							range.setEnd(prev, (prev as Text).length);
						}
					}
				}
			}
			sel?.removeAllRanges();
			sel?.addRange(range);
			setTimeout(() => (isCaretAfterBR.current = false), 0);
		},
		[],
	);

	const jumpOutsideFormattingElementWhenAtEndContainer = useCallback(() => {
		const range = getRange();
		const selection = document.getSelection();
		const endContainer = range?.endContainer;

		if (
			endContainer?.textContent !== range?.startContainer.textContent ||
			range?.startOffset !== range?.endOffset
		)
			return;

		if (!refElement.current || !endContainer || !range) return;

		const formattingElement = endContainer.parentElement;
		if (
			formattingElement &&
			getMainHTMLFormattingOrAnchorElement(endContainer)?.nodeType ===
				1 &&
			endContainer.textContent?.length === range.endOffset
		) {
			if (endContainer.nextSibling && endContainer.previousSibling) {
				return;
			}
			range.setStartAfter(formattingElement);
			range.setEndAfter(formattingElement);

			range.collapse();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	}, []);

	const moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR =
		useCallback(() => {
			const range = getRange();
			const selection = document.getSelection();
			const endContainer = range?.endContainer;

			if (
				endContainer?.textContent !==
					range?.startContainer.textContent ||
				range?.startOffset !== range?.endOffset
			)
				return;
			if (!refElement.current || !endContainer || !range) return;
			const mainElementFormattingEl =
				getMainHTMLFormattingOrAnchorElement(endContainer);
			if (
				(mainElementFormattingEl?.previousSibling as Element)
					?.tagName === 'BR' &&
				mainElementFormattingEl?.nodeType === 1 &&
				range.startOffset === 0
			) {
				range.setStartBefore(mainElementFormattingEl);
				range.setEndBefore(mainElementFormattingEl);
				selection?.removeAllRanges();
				selection?.addRange(range);
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
						//it is a text node and caret at the beginning of container
						if (range.endOffset === 0) {
							const content = range.endContainer.textContent;
							const newContent = newValue + content;

							range.endContainer.nodeValue = newContent;

							range.setStart(range.endContainer, 1);
							range.setEnd(range.endContainer, 1);
						} else {
							//it is a text node and caret at the end of container
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
						//case it is a node element
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
							(range?.endContainer as HTMLElement).hasAttribute(
								'contenteditable',
							)
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
							if (range.endContainer.nodeType === 1) {
								range.insertNode(newTextNode);
								range.setStart(newTextNode, 1);
								range.setEnd(newTextNode, 1);
							} else {
								range.endContainer.nodeValue =
									range.endContainer.nodeValue + newValue;
								range.setStart(
									range.endContainer,
									(range.endContainer as Text).length,
								);
								range.setEnd(
									range.endContainer,
									(range.endContainer as Text).length,
								);
							}
						}
					}

					sel?.removeAllRanges();
					sel?.addRange(range);
					saveRange();
					// translate whitespace
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
			const originalEndContainer = getMatchedContainers()?.end || null;
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
		[caretPosition, getMatchedContainers],
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

	const handleKeyDown = useCallback(
		(e: KeyDownEvent) => {
			navigateThroughNestedElementsOnArrowKeys(e);

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

		el?.addEventListener('click', handleOnClick);
		el?.addEventListener('beforeinput', handleInput);

		return () => {
			el?.removeEventListener('click', handleOnClick);
			el?.removeEventListener('beforeinput', handleInput);
		};
	}, [
		jumpOutsideFormattingElementWhenAtEndContainer,
		moveCaretOutsideFormattingElementWhenAtOffsetZeroAndAfterBR,
		inputCharManuallyWhenCaretAtStartOrEndTextOrBtwnFormattingElements,
	]);

	useLayoutEffect(() => {
		if (
			typeof undoState?.html !== 'undefined' &&
			undoState?.caretPosition
		) {
			setContent(undoState?.html);
			setCaretPosition(undoState?.caretPosition);
		}
	}, [undoState, setCaretPosition]);
	return {
		refElement,
		content,
		setContent,
		handleKeyDown,
		handleInput,
		handleInputIME,
		handleCompositionStart,
	};
};
export default useCaretPositioning;
