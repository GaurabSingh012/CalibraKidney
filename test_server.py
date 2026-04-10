from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # This allows the mobile app to talk to the server

@app.route('/predict', methods=['POST'])
def predict():
    # This just returns a dummy response to test the connection
    print("Received a request from the mobile app!")
    return jsonify({
        "status": "success",
        "label": "G2",
        "confidence": 0.85,
        "message": "Connection working! This is dummy data."
    })

if __name__ == '__main__':
    # host='0.0.0.0' makes it visible to your phone on the Wi-Fi
    app.run(host='0.0.0.0', port=5000, debug=True)
