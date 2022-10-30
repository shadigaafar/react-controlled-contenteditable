# React Controlled Contenteditable

# مكوّن ريأكت مضبوط للمحتوى القابل للتحرير

على عكس الحزم الأخرى ، فإن مكوّن ContentEditable هذا يمكن التحكم فيه بالكامل. مع القدرة على التنقل عبر عناصر html للتنسيق المتداخلة باستخدام مفاتيح الأسهم.
وخلافا لحزمة [react-contenteditable
](https://github.com/lovasoa/react-contenteditable) تستطيع استعمال `useState` من غير أن تواجه أي مشاكل.

## التنصيب

### `npm i react-controlled-contenteditable`

## الخواص

| الخاصية                           | الوصف                                                  | النوع     |
| --------------------------------- | ------------------------------------------------------ | --------- |
| String                            | **مطلوبة:** نص HTML الداخلي للعنصر القابل للتحرير      | html      |
| (e: ContentEditableEvent) => void | **مطلوبة:** يتم استدعاؤها حينما تتغير قيمة `innerHTML` | onChange  |
| (e: KeyDownEvent) => void         | يتم استدعاؤها حينما يتم الضغط على مفاتح ما.            | onKeyDown |
| any                               | خواص أخرى مثل، style، ref وإلخ ....                    | البقية... |

ملاحظة: نوع `KeyDownEvent` يختلف عن `React.KeyboardEvent` من حيث أن الأول يأتي مع `isComposing` على عكس الأخير.

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

## المساهمة

الباب مفتوح على مصرعيه للمساهمة.
