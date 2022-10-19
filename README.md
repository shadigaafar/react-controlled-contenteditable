# React Controlled Contenteditable

Unlike other packages, this is a fully Controlled contenteditable. with ability to navigate through nested formatting elements with arrow keys. and Unlike
[react-contenteditable
](https://github.com/lovasoa/react-contenteditable) package, you can use `useState` or whatever with no issues.

## Install

### `npm start`

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
			<ContentEditable onChange={handleChange} html={content} />
		</div>
	);
}

export default App;
```

## Contribution

The doors are all open for contribution
