import React, {
	useEffect,
	forwardRef,
	HTMLAttributes,
	useRef,
	memo,
} from 'react';
import {mergeRefs} from 'react-merge-refs';
import useCaretPositioning from './useCaretPositioning';
import fastDeepEqual from 'fast-deep-equal/react';
export type ContentEditableEvent = React.SyntheticEvent<HTMLElement, Event> & {
	target: {value: string};
};
export type KeyDownEvent = React.KeyboardEvent<HTMLElement> & {
	isComposing: boolean;
};
type Modify<T, R, R2> = Pick<
	T,
	Exclude<keyof T, keyof R> & Exclude<keyof T, keyof R2>
> &
	R &
	R2;
type DivProps = Modify<
	HTMLAttributes<HTMLElement>,
	{onChange: (event: ContentEditableEvent) => void},
	{onKeyDown?: (event: KeyDownEvent) => void}
>;
export interface ContentEditableProps extends DivProps {
	tagName?: string;
	html: string;
}

const ContentEditable = forwardRef(
	(
		{
			tagName = 'div',
			onChange,
			html,
			onKeyDown,
			onInput,
			onCompositionStart,
			onCompositionEnd,
			...rest
		}: ContentEditableProps,
		ref,
	) => {
		const {
			refElement,
			content,
			setContent,
			handleInput,
			handleKeyDown,
			handleInputIME,
			handleCompositionStart,
			...props
		} = useCaretPositioning();

		const isComposing = useRef(false);
		const handleOnChange = (e: React.SyntheticEvent<HTMLElement>) => {
			if (isComposing.current) {
				return;
			}
			handleInput(e);
			const htmlContent = (e.target as HTMLElement).innerHTML;

			const evt = Object.assign({}, e, {
				target: {
					value: htmlContent,
				},
			});
			onChange?.(evt);
			onInput?.(e);
		};
		const handleKeydown = (e: React.KeyboardEvent<HTMLElement>) => {
			const evt = Object.assign({}, e, {
				isComposing: isComposing.current,
				preventDefault: e.preventDefault,
			});
			handleKeyDown(evt);

			onKeyDown?.(evt);
		};

		const _handleCompositionStart = (
			e: React.CompositionEvent<HTMLElement>,
		) => {
			isComposing.current = true;
			handleCompositionStart(e);
			onCompositionStart?.(e);
		};

		const handleCompositionEnd = (
			e: React.CompositionEvent<HTMLElement>,
		) => {
			handleInputIME(e);
			isComposing.current = false;
			onCompositionEnd?.(e);
		};

		useEffect(() => {
			if (!html) return;
			setContent(html);
		}, [html, setContent]);

		return React.createElement(tagName, {
			onCompositionStart: _handleCompositionStart,
			onCompositionEnd: handleCompositionEnd,
			onKeyDown: handleKeydown,

			onInput: handleOnChange,
			dangerouslySetInnerHTML: {__html: content},
			contentEditable: true,
			ref: mergeRefs([refElement, ref]),
			dir: 'auto',
			...props,
			...rest,
		});
	},
);

const isPropsEqual = (
	prevProp: ContentEditableProps,
	nextProp: ContentEditableProps,
) => {
	return fastDeepEqual(prevProp, nextProp);
};
export default memo(ContentEditable, isPropsEqual);
