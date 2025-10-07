from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

def load_content():
    """Load content from unit1.json"""
    json_path = os.path.join(os.path.dirname(__file__), 'unit1.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            content = file.read().strip()
            if not content:
                raise ValueError("JSON file is empty")
            return json.loads(content)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as e:
        print(f"Error loading JSON: {e}")
        # Fallback content matches the full unit1.json content
        return {
            "lesson_title": "School Items, Numbers, and New Words",
            "sections": [
                {
                    "title": "School Objects & Things",
                    "cards": [
                        {"english_phrase": "pencil", "emoji": "✏️"},
                        {"english_phrase": "eraser", "emoji": "🩹"},
                        {"english_phrase": "sharpener", "emoji": "✏️"},
                        {"english_phrase": "ruler", "emoji": "📏"},
                        {"english_phrase": "backpack ", "emoji": "🎒"},
                        {"english_phrase": "pen", "emoji": "🖊️"},
                        {"english_phrase": "pencil case", "emoji": "👝"},
                        {"english_phrase": "scissors", "emoji": "✂️"},
                        {"english_phrase": "notebook", "emoji": "📓"},
                        {"english_phrase": "computer", "emoji": "💻"},
                        {"english_phrase": "books", "emoji": "📚"}
                    ]
                },
                {
                    "title": "Questions & Expressions",
                    "cards": [
                        {"english_phrase": "What's this?", "emoji": "❓"},
                        {"english_phrase": "It's a pencil.", "emoji": "🗣️"},
                        {"english_phrase": "What colour is it?", "emoji": "🎨"},
                        {"english_phrase": "It's yellow.", "emoji": "⭐"},
                        {"english_phrase": "I'm very well.", "emoji": "😁"},
                        {"english_phrase": "I like to play.", "emoji": "⚽"}
                    ]
                },
                {
                    "title": "Numbers",
                    "cards": [
                        {"english_phrase": "one", "emoji": "1️⃣"},
                        {"english_phrase": "two", "emoji": "2️⃣"},
                        {"english_phrase": "three", "emoji": "3️⃣"},
                        {"english_phrase": "four", "emoji": "4️⃣"},
                        {"english_phrase": "five", "emoji": "5️⃣"},
                        {"english_phrase": "six", "emoji": "6️⃣"},
                        {"english_phrase": "seven", "emoji": "7️⃣"},
                        {"english_phrase": "eight", "emoji": "8️⃣"},
                        {"english_phrase": "eleven", "emoji": "1️⃣1️⃣"},
                        {"english_phrase": "twelve", "emoji": "1️⃣2️⃣"}
                    ]
                },
                {
                    "title": "Practice Dialogue: Asking about Objects",
                    "cards": [
                        {"english_phrase": "A: What's this? B: It's a pencil. A: What colour is it? B: It's yellow.", "emoji": "📝"},
                        {"english_phrase": "A: Hi, my name's Laura. How are you? B: Hello, Adrian. I'm very well. And you?", "emoji": "🤝"}
                    ]
                }
            ]
        }

@app.route('/')
def home():
    """Homepage with all sections and carousels"""
    content = load_content()
    return render_template('index.html', content=content)

@app.route('/api/content')
def api_content():
    """API endpoint to get content (useful for dynamic updates)"""
    content = load_content()
    return jsonify(content)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)