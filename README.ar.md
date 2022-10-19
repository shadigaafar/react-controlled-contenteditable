# React Controlled Contenteditable

# مكوّن ريأكت مضبوط للمحتوى القابل للتحرير

على عكس الحزم الأخرى ، فإن مكوّن ContentEditable هذا يمكن التحكم فيه بالكامل. مع القدرة على التنقل عبر عناصر html للتنسيق المتداخلة باستخدام مفاتيح الأسهم.
وخلافا لحزمة [react-contenteditable
](https://github.com/lovasoa/react-contenteditable) تستطيع استعمال `useState` من غير أن تواجه أي مشاكل.

## التنصيب

### `npm i react-controlled-contenteditable`

## مثال

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

## المساهمة

الباب مفتوح على مصرعيه للمساهمة.
