import {useCallback, useEffect, useState} from 'react';
import {CaretPosition} from './useCaretPositioning';
import fastDeepEqual from 'fast-deep-equal/react';

interface State {
	caretPosition: CaretPosition;
	html: string;
	action: string;
}
const keys = ['Backspace', 'Paste', 'Enter', 'Delete'];

const useUndo = (el: HTMLElement, caretPosition: CaretPosition) => {
	const [allChanges, setAllChanges] = useState<State[]>();
	const [undoState, setUndoState] = useState<State>();
	const [prevCaretPosition, setPrevCaretPost] = useState<CaretPosition>();
	const [hasCaretPosChangedByUser, setHasCaretPosChangedByUser] =
		useState(false);

	const detectCaretChange = useCallback(() => {
		if (
			caretPosition?.endContainerPos &&
			prevCaretPosition &&
			fastDeepEqual(
				caretPosition?.endContainerPos,
				prevCaretPosition?.endContainerPos,
			)
		) {
			const diff = Math.abs(
				caretPosition.endOffset - prevCaretPosition.endOffset,
			);
			if (diff > 2) {
				setHasCaretPosChangedByUser(true);
				return;
			}
			setHasCaretPosChangedByUser(false);
			return;
		}
		setHasCaretPosChangedByUser(true);
	}, [prevCaretPosition, caretPosition]);

	const saveChanges = useCallback(
		(action: string) => {
			if (!el) return;
			setAllChanges((prev) => {
				let prevChanges = [...(prev ? prev : [])];
				const lastChange = prev ? prev[prev?.length - 1] : null;
				if (
					lastChange?.action === action ||
					lastChange?.html === el.innerHTML
				) {
					return prevChanges;
				}
				return [
					...prevChanges,
					{
						caretPosition,
						html: el.innerHTML,
						action: action,
					},
				];
			});
		},
		[el, caretPosition],
	);

	const undo = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Undo' || (e.ctrlKey && e.code === 'KeyZ')) {
				let changes = [...(allChanges ? allChanges : [])];
				let lastChange = changes.pop();
				setUndoState(lastChange);
				setAllChanges(changes);
			}
		},
		[allChanges],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const isLetter =
				e.code.substring(0, 3).toLocaleLowerCase() === 'key';
			const isNumber =
				e.code.substring(0, 6).toLocaleLowerCase() === 'numpad';
			const isDigit =
				e.code.substring(0, 5).toLocaleLowerCase() === 'digit';
			const isChar = isDigit || isNumber || isLetter;
			if (
				keys.includes(e.key) ||
				(e.ctrlKey && e.code === 'KeyV') ||
				(e.shiftKey && e.code === 'Enter') ||
				isLetter
			) {
				let action =
					e.ctrlKey && e.code === 'KeyV'
						? 'Paste'
						: isChar
						? 'isChar'
						: e.key;
				if (action === 'isChar') {
					setPrevCaretPost(caretPosition);
				}
				if (action === 'isChar' && hasCaretPosChangedByUser) {
					action = 'caretPosChangedByUser';
					setHasCaretPosChangedByUser(false);
				}
				saveChanges(action);
			}

			undo(e);
		},
		[
			saveChanges,
			undo,
			setPrevCaretPost,
			caretPosition,
			hasCaretPosChangedByUser,
		],
	);

	const handleOnClick = useCallback(
		(e: MouseEvent) => {
			e.stopImmediatePropagation();
			detectCaretChange();
		},
		[detectCaretChange],
	);

	useEffect(() => {
		const editable = el;
		editable?.addEventListener('click', handleOnClick);
		editable?.addEventListener('keydown', handleKeyDown);

		return () => {
			editable?.removeEventListener('keydown', handleKeyDown);
			editable?.removeEventListener('click', handleOnClick);
		};
	}, [el, handleKeyDown, handleOnClick]);

	return undoState;
};
export default useUndo;