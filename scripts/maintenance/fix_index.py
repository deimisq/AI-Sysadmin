import re

file_path = '/var/www/agent/index.html'

try:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace anything that looks like 0.9.x-betaY or Versión 0.9.x
    new_version = "0.9.2-beta1"
    
    # Patterns to replace
    patterns = [
        r'0\.9\.[0-9]+(-beta[0-9]*)?',
        r'Versión [0-9\.-]+beta[0-9]*'
    ]
    
    # We want to be careful not to replace things like "Sentrait 2024" if they happen to match something weird, 
    # but the version patterns are pretty specific.
    
    updated_content = content
    # Replace explicit old versions first
    updated_content = re.sub(r'0\.9\.1-beta10', new_version, updated_content)
    updated_content = re.sub(r'0\.9\.0-beta9', new_version, updated_content)
    
    # Generically replace 0.9.0 and 0.9.1 if still present
    updated_content = re.sub(r'0\.9\.1', new_version, updated_content)
    updated_content = re.sub(r'0\.9\.0', new_version, updated_content)

    with open('/home/ubuntu/ai_agent/index_new.html', 'w') as f:
        f.write(updated_content)
    print("Successfully created updated index.html")
except Exception as e:
    print(f"Error: {e}")
