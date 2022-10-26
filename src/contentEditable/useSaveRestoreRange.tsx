import {useRef, useCallback, useLayoutEffect, useState} from 'react';
import {getNodeDepthAndIndexes, getRange, getMatchedContainer} from './common';

export interface CaretPosition {
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
const useSaveRestoreRange = (el: HTMLElement) => {
	const [caretPosition, setCaretPosition] = useState<CaretPosition>();
	const isPaste = useRef(false);

	const getCaretPosition = useCallback(() => {
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

			return {
				endOffset: range.endOffset,
				startOffset: range.startOffset,
				startContainerPos,
				endContainerPos,
			};
		}
	}, []);
	const saveRange = useCallback(() => {
		setCaretPosition(getCaretPosition());
	}, []);

	const getMatchedContainers = useCallback(() => {
		if (!caretPosition || !el) return {start: null, end: null};

		const end = getMatchedContainer(el, caretPosition.endContainerPos);
		const start = getMatchedContainer(el, caretPosition.startContainerPos);

		return {start, end};
	}, [caretPosition]);

	const restoreCaretPosition = useCallback(() => {
		const sel = document.getSelection();

		const range = new Range();

		if (caretPosition) {
			const matchedEndContainer = getMatchedContainers()?.end;
			const matchedStartContainer = getMatchedContainers()?.start;

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

	useLayoutEffect(() => {
		const element = el;
		const handleOnPaste = () => {
			isPaste.current = true;
		};
		element?.addEventListener('paste', handleOnPaste);

		return () => element?.removeEventListener('paste', handleOnPaste);
	}, []);

	return {
		caretPosition,
		getMatchedContainers,
		saveRange,
		restoreCaretPosition,
		getCaretPosition,
		setCaretPosition,
	};
};
export default useSaveRestoreRange;
