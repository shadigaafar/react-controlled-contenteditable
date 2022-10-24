import {useState} from 'react';
import ContentEditable, {ContentEditableEvent} from './contentEditable';

function App() {
	const [content, setContent] = useState(
		'<p>We hope you are enjoying&nbsp;<br><b><i>React</i><i> Controlled</i>&nbsp;<del>Contenteditable</del>&nbsp;</b>, if you find any issues, please report them</p>',
	);
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
