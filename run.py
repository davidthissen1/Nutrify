import sys
import os

# Add the project root directory to Python's path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5006))
    app.run(host='0.0.0.0', port=port, debug=False)