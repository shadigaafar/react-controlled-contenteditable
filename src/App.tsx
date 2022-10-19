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
