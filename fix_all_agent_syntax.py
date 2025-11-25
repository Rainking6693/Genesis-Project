"""
Fix all syntax errors in agent files with excellence instructions
"""
import os
import re

def fix_excellence_instructions(content):
    """Fix malformed excellence instructions in agent files"""
    # Pattern to match the problematic instruction strings
    pattern = r'instructions="You are the world\'s premier (\w+) \? recognized globally.*?""You are'
    replacement = r'instructions="""You are the world\'s premier \1 specialist - recognized globally for innovative, cost-effective, and exceptional results. You deliver elegant, efficient, and reliable outcomes every time. You are'

    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    # Also fix the simpler version without the second quote
    pattern2 = r'instructions="You are the world\'s premier (\w+) \? recognized globally[^"]*?"(?!")'
    replacement2 = r'instructions="""You are the world\'s premier \1 specialist - recognized globally for innovative, cost-effective, and exceptional results. You deliver elegant, efficient, and reliable outcomes every time."""'

    content = re.sub(pattern2, replacement2, content)

    return content

def fix_file(filepath):
    """Fix a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        content = fix_excellence_instructions(content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {filepath}")
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    agents_dir = r"C:\Users\Administrator\Desktop\Genesis-Project\agents"

    # Get all .py files in agents directory
    for filename in os.listdir(agents_dir):
        if filename.endswith('.py'):
            filepath = os.path.join(agents_dir, filename)
            fix_file(filepath)

    print("Done fixing agent files")

if __name__ == "__main__":
    main()