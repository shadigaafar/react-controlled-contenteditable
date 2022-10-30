[بالعربي
](https://github.com/shadigaafar/react-controlled-contenteditable/blob/main/README.ar.md)

# React Controlled Contenteditable

Unlike other packages, this is a fully Controlled contenteditable. with ability to navigate through nested formatting elements with arrow keys. and Unlike
[react-contenteditable
](https://github.com/lovasoa/react-contenteditable) package, you can use `useState` or whatever with no issues.

## Demo

[Click here
](https://64d9jc.csb.app/)

## Install

### `npm i react-controlled-contenteditable`

## Props

| prop      | description                                       | type                              |
| --------- | ------------------------------------------------- | --------------------------------- |
| html      | **required:** innerHTML of the editable element   | String                            |
| onChange  | **required:** called whenever `innerHTML` changes | (e: ContentEditableEvent) => void |
| onKeyDown | called whenever a key is pressed                  | (e: KeyDownEvent) => void         |
| ...rest   | any other props you like, ref, style and etc...   | any                               |

Note: `KeyDownEvent` type differs from `React.KeyboardEvent` in which the first comes with an extra property `isComposing` while the latter don't.

## Example

```javascript
import {useState} from 'react';
import ContentEditable, {ContentEditableEvent} from './contentEditable';

function App() {
	const [content, setContent] = useState('');
	const handleChange = (e: ContentEditableEvent) => {
		setContent(e.target.value);
	};
	return (
		<div className="App">
			<ContentEditable
				onChange={handleChange}
				html={content}
				tagName="div"
			/>
		</div>
	);
}

export default App;
```

## Contribution

The doors are all open for contribution
