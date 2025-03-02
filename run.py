import sys
import os

# Add the project root directory to Python's path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(port=5004, debug=True)