#!/usr/bin/env python3
"""
License validation server for agent.sentrait.com.uy
Simple Flask API to validate license keys
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import hashlib
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# License database file
LICENSE_DB_FILE = "/var/www/agent/licenses.json"

def load_licenses():
    """Load licenses from JSON file"""
    if not os.path.exists(LICENSE_DB_FILE):
        return {}
    
    with open(LICENSE_DB_FILE, 'r') as f:
        return json.load(f)

def save_licenses(licenses):
    """Save licenses to JSON file"""
    with open(LICENSE_DB_FILE, 'w') as f:
        json.dump(licenses, f, indent=2)

@app.route('/api/v1/license/validate', methods=['POST'])
def validate_license():
    """Validate a license key"""
    data = request.get_json()
    
    if not data or 'license_key' not in data:
        return jsonify({
            "valid": False,
            "status": "invalid_request",
            "message": "License key is required"
        }), 400
    
    license_key = data['license_key']
    installation_id = data.get('installation_id')
    
    licenses = load_licenses()
    
    # Check if license exists
    if license_key not in licenses:
        return jsonify({
            "valid": False,
            "status": "not_found",
            "message": "License key not found"
        }), 404
    
    license_data = licenses[license_key]
    
    # Check if expired
    expires_at = datetime.fromisoformat(license_data['expires_at'])
    if expires_at < datetime.utcnow():
        return jsonify({
            "valid": False,
            "status": "expired",
            "message": f"License expired on {expires_at.strftime('%Y-%m-%d')}",
            "license_data": license_data
        }), 200
    
    # Check if active
    if not license_data.get('is_active', True):
        return jsonify({
            "valid": False,
            "status": "inactive",
            "message": "License has been deactivated",
            "license_data": license_data
        }), 200
    
    # Update last validation
    license_data['last_validated'] = datetime.utcnow().isoformat()
    license_data['validation_count'] = license_data.get('validation_count', 0) + 1
    
    # Track installation if provided
    if installation_id and 'installation_id' not in license_data:
        license_data['installation_id'] = installation_id
    
    licenses[license_key] = license_data
    save_licenses(licenses)
    
    # Calculate days remaining
    days_remaining = (expires_at - datetime.utcnow()).days
    
    return jsonify({
        "valid": True,
        "status": "active",
        "message": "License is valid",
        "license_data": {
            "license_type": license_data['license_type'],
            "max_servers": license_data['max_servers'],
            "max_users": license_data['max_users'],
            "expires_at": license_data['expires_at'],
            "days_remaining": days_remaining
        }
    }), 200

@app.route('/api/v1/license/info', methods=['GET'])
def license_info():
    """Get information about licensing"""
    return jsonify({
        "message": "AI Sysadmin Agent - License Server",
        "version": "1.0.0",
        "contact": "licenses@sentrait.com.uy"
    }), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # Create licenses file if it doesn't exist
    if not os.path.exists(LICENSE_DB_FILE):
        os.makedirs(os.path.dirname(LICENSE_DB_FILE), exist_ok=True)
        save_licenses({})
    
    app.run(host='0.0.0.0', port=5000, debug=False)
