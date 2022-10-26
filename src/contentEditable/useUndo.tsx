import {useRef, useCallback, useEffect, useState} from 'react';
import fastDeepEqual from 'fast-deep-equal/react';
import useSaveRestoreRange, {CaretPosition} from './useSaveRestoreRange';

interface State {
	caretPosition: CaretPosition;
	html: string;
	action: string;
}
const keys = ['Backspace', 'Paste', 'Enter', 'Delete'];

const useUndo = (el: HTMLElement) => {
	const [allChanges, setAllChanges] = useState<State[]>();
	const [undoState, setUndoState] = useState<State>();
	const [prevCaretPosition, setPrevCaretPost] = useState<CaretPosition>();

	useState(false);
	const hasCaretPosChangedByUser = useRef(false);
	const {getCaretPosition} = useSaveRestoreRange(el);
	const detectCaretChange = useCallback(() => {
		const caretPosition = getCaretPosition();
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
				hasCaretPosChangedByUser.current = true;
				return;
			}
			hasCaretPosChangedByUser.current = false;
			return;
		}
		hasCaretPosChangedByUser.current = true;
	}, [prevCaretPosition, getCaretPosition]);

	const saveChanges = useCallback(
		(action: string) => {
			const caretPos = getCaretPosition();
			if (!el || !caretPos) return;
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
						caretPosition: caretPos,
						html: el.innerHTML,
						action: action,
					},
				];
			});
		},
		[el, getCaretPosition],
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
					setPrevCaretPost(getCaretPosition());
				}
				if (action === 'isChar' && hasCaretPosChangedByUser.current) {
					action = 'caretPosChangedByUser';
					hasCaretPosChangedByUser.current = false;
				}
				saveChanges(action);
			}

			undo(e);
		},
		[
			saveChanges,
			undo,
			setPrevCaretPost,
			getCaretPosition,
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
